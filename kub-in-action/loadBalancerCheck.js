#!/usr/bin/env node

/**
 * checkLoadBalancer.js
 *
 * Usage:
 *   node checkLoadBalancer.js <url> <totalRequests> [concurrency]
 *
 * Examples:
 *   node checkLoadBalancer.js http://scarx.local 100
 *   node checkLoadBalancer.js http://scarx.local 100 20
 *
 * Arguments:
 *   url            – The endpoint to hit (e.g. http://scarx.local or http://10.0.0.1:8080)
 *   totalRequests  – Total number of requests to send
 *   concurrency    – How many requests fly in parallel at once (default: totalRequests, i.e. all at once)
 *
 * Expected API response body (plain text):
 *   ScarX version 0.1. Request processed by "scarx-b5d59fdc5-wdcx9". Client IP: ::ffff:10.244.2.1
 */

const http = require("http");
const https = require("https");

// ─── Helpers ────────────────────────────────────────────────────────────────

/** ANSI colour helpers (gracefully disabled when not a TTY) */
const isTTY = process.stdout.isTTY;
const bold = (s) => isTTY ? `\x1b[1m${s}\x1b[0m` : s;
const green = (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s;
const cyan = (s) => isTTY ? `\x1b[36m${s}\x1b[0m` : s;
const dim = (s) => isTTY ? `\x1b[2m${s}\x1b[0m` : s;
const red = (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s;
const yellow = (s) => isTTY ? `\x1b[33m${s}\x1b[0m` : s;

/** Pad a string to a fixed width */
const pad = (str, len) => String(str).padEnd(len);

/** Build a simple ASCII bar proportional to pct (0–100) */
const bar = (pct, width = 20) => {
    const filled = Math.round((pct / 100) * width);
    return "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
};

// ─── HTTP fetch (no external deps) ──────────────────────────────────────────

function fetchText(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith("https") ? https : http;
        const req = lib.get(url, { timeout: 10_000, rejectUnauthorized: false  }, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => resolve({ ok: true, body, status: res.statusCode }));
        });
        req.on("error", (err) => resolve({ ok: false, error: err.message }));
        req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "timeout" }); });
    });
}

// ─── Pod-name parser ─────────────────────────────────────────────────────────

/** Extract the pod name from the API response body.
 *  Matches: Request processed by "scarx-b5d59fdc5-wdcx9"
 */
function parsePodName(body) {
    const match = body.match(/Request processed by "([^"]+)"/);
    return match ? match[1] : null;
}

// ─── Concurrent runner ────────────────────────────────────────────────────────

/**
 * Run `total` async tasks with at most `concurrency` running at once.
 * `taskFn` receives the zero-based task index and must return a Promise.
 */
async function runConcurrent(total, concurrency, taskFn) {
    const results = [];
    let next = 0;

    async function worker() {
        while (next < total) {
            const idx = next++;
            results[idx] = await taskFn(idx);
        }
    }

    // No of concurrent Workers.
    const workers = Array.from({ length: Math.min(concurrency, total) }, worker);
    await Promise.all(workers);
    return results;
}

// ─── Progress bar (in-place) ─────────────────────────────────────────────────

function makeProgress(total) {
    let done = 0;
    const tick = () => {
        done++;
        if (!isTTY) return;                         // skip in non-interactive shells
        const pct = Math.round((done / total) * 100);
        const filled = Math.round((done / total) * 30);
        const b = "[" + "█".repeat(filled) + "░".repeat(30 - filled) + "]";
        process.stdout.write(`\r  ${b} ${done}/${total} (${pct}%)`);
        if (done === total) process.stdout.write("\n");
    };
    return { tick };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const [, , urlArg, totalArg, concurrencyArg] = process.argv;

    if (!urlArg || !totalArg) {
        console.error(
            red("Usage: node checkLoadBalancer.js <url> <totalRequests> [concurrency]")
        );
        console.error(dim("  e.g.  node checkLoadBalancer.js http://scarx.local 100 20"));
        process.exit(1);
    }

    const url = /^https?:\/\//i.test(urlArg) ? urlArg : `http://${urlArg}`;
    const total = parseInt(totalArg, 10);
    const concurrency = concurrencyArg ? parseInt(concurrencyArg, 10) : total;

    if (isNaN(total) || total < 1) {
        console.error(red("totalRequests must be a positive integer."));
        process.exit(1);
    }
    if (isNaN(concurrency) || concurrency < 1) {
        console.error(red("concurrency must be a positive integer."));
        process.exit(1);
    }

    console.log();
    console.log(bold("  Load Balancer Checker"));
    console.log(dim("  ─────────────────────────────────────────"));
    console.log(`  ${dim("URL          ")} ${cyan(url)}`);
    console.log(`  ${dim("Total reqs   ")} ${cyan(total)}`);
    console.log(`  ${dim("Concurrency  ")} ${cyan(concurrency)}`);
    console.log();

    const progress = makeProgress(total);
    const tally = {};   // { podName: count }
    let errors = 0;

    const startTime = Date.now();

    await runConcurrent(total, concurrency, async () => {
        const result = await fetchText(url);
        progress.tick();

        if (!result.ok) {
            errors++;
            return;
        }

        const pod = parsePodName(result.body);
        if (!pod) {
            errors++;
            return;
        }

        tally[pod] = (tally[pod] ?? 0) + 1;
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // ── Results ──────────────────────────────────────────────────────────────

    const succeeded = total - errors;
    const pods = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const maxNameLen = Math.max(...pods.map(([n]) => n.length), 8);

    console.log();
    console.log(bold("  Results"));
    console.log(dim("  ─────────────────────────────────────────"));

    if (pods.length === 0) {
        console.log(red("  No successful responses were parsed. Check the URL and response format."));
    } else {
        for (const [podName, count] of pods) {
            const pct = ((count / total) * 100).toFixed(0);
            const pctNum = parseFloat(pct);
            const b = bar(pctNum);
            console.log(
                `  ${green(pad(podName, maxNameLen))}  ${cyan(pad(count, 6))}/${total}  (${yellow(pct + "%")})  ${dim(b)}`
            );
        }
    }

    console.log();
    console.log(dim("  ─────────────────────────────────────────"));
    console.log(`  ${dim("Succeeded")}  ${green(succeeded)}/${total}`);
    if (errors > 0) {
        console.log(`  ${dim("Errors    ")}  ${red(errors)}`);
    }
    console.log(`  ${dim("Pods seen ")}  ${cyan(pods.length)}`);
    console.log(`  ${dim("Time      ")}  ${elapsed}s`);
    console.log();

    // ── Plain summary (always printed, easy to grep) ─────────────────────────
    console.log(bold("  Summary (plain)"));
    console.log(dim("  ─────────────────────────────────────────"));
    for (const [podName, count] of pods) {
        const pct = ((count / total) * 100).toFixed(0);
        console.log(`  ${podName}: ${count}/${total} (${pct}%)`);
    }
    console.log();
}

main().catch((err) => {
    console.error(red("Unexpected error: " + err.message));
    process.exit(1);
});