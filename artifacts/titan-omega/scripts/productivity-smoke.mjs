import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";

const APP_URL = process.env.TITAN_URL || "http://127.0.0.1:80/";
const CHROMIUM = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const TEST_MARKER = `Productivity smoke ${Date.now()}`;
const TEST_FILE = "cross-app-smoke.md";
const TEST_CODE_FILE = "cross-app-smoke.js";
const TEST_TERMINAL_FILE = "terminal-smoke.txt";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function freePort() {
    return await new Promise((resolve, reject) => {
        const server = createServer();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
    });
}

async function waitForJson(url, timeoutMs = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) return await response.json();
        } catch {
            // Chromium has not opened the debugging endpoint yet.
        }
        await sleep(100);
    }
    throw new Error(`Timed out waiting for ${url}`);
}

async function waitForPageExpression(evaluate, expression, timeoutMs = 20000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            if (await evaluate(expression)) return;
        } catch {
            // The page is still loading or the application has not booted.
        }
        await sleep(150);
    }
    throw new Error(`Timed out waiting for page condition: ${expression}`);
}

async function main() {
    const port = await freePort();
    const profileDir = await mkdtemp(`${tmpdir()}/titan-omega-smoke-`);
    const chromium = spawn(CHROMIUM, [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profileDir}`,
        "about:blank",
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    chromium.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    try {
        const targets = await waitForJson(`http://127.0.0.1:${port}/json`);
        const tab = targets.find((target) => target.type === "page");
        if (!tab) throw new Error("Chromium did not expose a page target");
        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        let commandId = 0;
        const pending = new Map();
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const resolve = pending.get(message.id);
            if (resolve) {
                pending.delete(message.id);
                resolve(message);
            }
        };

        const command = (method, params = {}) => new Promise((resolve) => {
            const id = ++commandId;
            pending.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });

        const evaluate = async (expression) => {
            const response = await command("Runtime.evaluate", {
                expression,
                awaitPromise: true,
                returnByValue: true,
            });
            if (response.error) throw new Error(JSON.stringify(response.error));
            if (response.result?.exceptionDetails) {
                const details = response.result.exceptionDetails;
                throw new Error(details.exception?.description || details.text || "Page evaluation failed");
            }
            return response.result?.result?.value;
        };

        await command("Page.enable");
        await command("Runtime.enable");
        await command("Page.navigate", { url: APP_URL });
        await waitForPageExpression(evaluate, "document.getElementById('boot-screen')?.classList.contains('boot-hidden')");

        const result = await evaluate(`(async () => {
            const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            const assertPage = (condition, message) => { if (!condition) throw new Error(message); };
            const closeAll = async () => {
                [...WindowManager.windows.values()].forEach((win) => WindowManager.close(win.id));
                await wait(240);
            };
            const windowFor = (appId) => [...WindowManager.windows.values()].find((win) => win.appId === appId);
            const enter = (input, value) => {
                input.value = value;
                input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            };

            await closeAll();
            StateManager.set("todos2", []);
            StateManager.set("notes3", []);
            StateManager.set("files", []);
            StateManager.set("mdEditorContent", "");

            const todoWin = AppRegistry.launch("todo");
            const todoRoot = todoWin.bodyEl;
            const taskInput = todoRoot.querySelector('input[placeholder="Add a new task…"]');
            const dueInput = todoRoot.querySelector('input[type="date"]');
            const priority = todoRoot.querySelector("select");
            const category = todoRoot.querySelectorAll("select")[1];
            assertPage(taskInput && dueInput && priority && category, "To-Do form controls are missing");
            taskInput.value = ${JSON.stringify(TEST_MARKER)};
            dueInput.value = "2099-01-01";
            priority.value = "high";
            category.value = "Research";
            todoRoot.querySelector("button.btn-primary").click();
            await wait(40);

            const createdTodo = StateManager.get("todos2").find((todo) => todo.text === ${JSON.stringify(TEST_MARKER)});
            assertPage(createdTodo?.dueDate === "2099-01-01", "To-Do did not persist the dated task");
            assertPage(createdTodo?.priority === "high" && createdTodo?.category === "Research", "To-Do metadata was lost");

            const agendaWin = AppRegistry.launch("agenda");
            assertPage(agendaWin.bodyEl.textContent.includes(${JSON.stringify(TEST_MARKER)}), "Agenda did not project the shared task");

            const todoItem = [...todoRoot.querySelectorAll(".todo-item")].find((item) => item.textContent.includes(${JSON.stringify(TEST_MARKER)}));
            todoItem?.querySelector('[title="Convert to note"]')?.click();
            await wait(40);
            const convertedNote = StateManager.get("notes3").find((note) => note.title === ${JSON.stringify(TEST_MARKER)});
            assertPage(convertedNote?.content.includes("Created from To-Do"), "To-Do to Notes conversion failed");

            const notesWin = AppRegistry.launch("notes");
            assertPage(notesWin.bodyEl.textContent.includes(${JSON.stringify(TEST_MARKER)}), "Notes did not render the converted task");

            await closeAll();
            const markdownFile = WorkspaceBridge.createFile({
                name: ${JSON.stringify(TEST_FILE)},
                path: "/Documents",
                type: "md",
                content: "# Before edit",
            });
            assertPage(markdownFile, "Shared Markdown file could not be created");
            WorkspaceBridge.openFile(markdownFile);
            const markdownWin = windowFor("md-editor");
            const markdownArea = markdownWin?.bodyEl.querySelector("textarea.md-textarea");
            assertPage(markdownArea, "Markdown file did not open in Markdown Editor");
            markdownArea.value = ${JSON.stringify(`# ${TEST_MARKER}\\n\\nShared editor content`)};
            markdownArea.dispatchEvent(new Event("input", { bubbles: true }));
            await wait(700);
            const editedMarkdown = WorkspaceBridge.findFile({ id: markdownFile.id });
            assertPage(editedMarkdown?.content.includes("Shared editor content"), "Markdown autosave did not update shared files");

            await closeAll();
            const codeFile = WorkspaceBridge.createFile({
                name: ${JSON.stringify(TEST_CODE_FILE)},
                path: "/code",
                type: "js",
                content: "console.log('smoke');",
            });
            WorkspaceBridge.openFile(codeFile);
            const codeWin = windowFor("code-editor");
            assertPage(codeWin?.bodyEl.querySelector("textarea.editor-textarea"), "JavaScript file did not open in Code Editor");

            await closeAll();
            const terminalWin = AppRegistry.launch("terminal");
            const terminalInput = terminalWin.bodyEl.querySelector('input[placeholder="Type a command…"]');
            assertPage(terminalInput, "Terminal input is missing");
            enter(terminalInput, "write /Documents/${TEST_TERMINAL_FILE} terminal-shared-content");
            await wait(40);
            const terminalFile = WorkspaceBridge.findFile({ path: "/Documents/${TEST_TERMINAL_FILE}" });
            assertPage(terminalFile?.content === "terminal-shared-content", "Terminal write did not update shared files");
            enter(terminalInput, "todo add Terminal generated task");
            await wait(40);
            assertPage(StateManager.get("todos2").some((todo) => todo.text === "Terminal generated task"), "Terminal todo command did not update shared tasks");

            await closeAll();
            const persistedBeforeReload = {
                task: StateManager.get("todos2").some((todo) => todo.text === "Terminal generated task"),
                markdown: WorkspaceBridge.findFile({ id: markdownFile.id })?.content.includes("Shared editor content"),
                terminalFile: WorkspaceBridge.findFile({ path: "/Documents/${TEST_TERMINAL_FILE}" })?.content === "terminal-shared-content",
            };
            assertPage(persistedBeforeReload.task && persistedBeforeReload.markdown && persistedBeforeReload.terminalFile, "Shared state was incomplete before reload");
            return persistedBeforeReload;
        })()`);

        await command("Page.reload", { ignoreCache: true });
        await waitForPageExpression(evaluate, "document.getElementById('boot-screen')?.classList.contains('boot-hidden')");
        const persisted = await evaluate(`(() => ({
            task: StateManager.get("todos2").some((todo) => todo.text === "Terminal generated task"),
            markdown: WorkspaceBridge.files().some((file) => file.name === ${JSON.stringify(TEST_FILE)} && file.content.includes("Shared editor content")),
            terminalFile: WorkspaceBridge.files().some((file) => file.name === ${JSON.stringify(TEST_TERMINAL_FILE)} && file.content === "terminal-shared-content"),
            windowsClosed: WindowManager.windows.size === 0
        }))()`);
        assert(persisted.task, "Terminal task did not survive reload");
        assert(persisted.markdown, "Markdown content did not survive reload");
        assert(persisted.terminalFile, "Terminal file did not survive reload");
        assert(persisted.windowsClosed, "Productivity smoke left windows open after reload");

        console.log(JSON.stringify({ beforeReload: result, afterReload: persisted }, null, 2));
        ws.close();
    } finally {
        if (chromium.exitCode === null) {
            chromium.kill("SIGTERM");
            await new Promise((resolve) => chromium.once("exit", resolve));
        }
        await rm(profileDir, { recursive: true, force: true });
        if (chromium.exitCode !== null && chromium.exitCode !== 0 && stderr.trim()) {
            process.stderr.write(stderr);
        }
    }
}

main().catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
});