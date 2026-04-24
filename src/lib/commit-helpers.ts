import { getEncoding } from "js-tiktoken";

const encoder = getEncoding("cl100k_base");

export function countTokens(text: string): number {
    return encoder.encode(text).length;
}

export function shouldIgnoreFile(line: string, ignorePatterns: string[]): boolean {
    const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (!match) return false;

    const [, fileA, fileB] = match;

    return ignorePatterns.some(pattern => {
        // folder match
        if (pattern.endsWith("/")) {
            return fileA?.includes(pattern) || fileB?.includes(pattern);
        }

        // exact file match (strict)
        const regex = new RegExp(pattern.replace(".", "\\.") + "$");
        return regex.test(fileA!) || regex.test(fileB!);
    });
}

export function extractMeaningfulDiff(diff: string): string {
    const ignorePatterns = [
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "dist/",
        "build/",
        "node_modules/",
        ".next/",
    ];

    const lines = diff.split("\n");

    const result: string[] = [];
    let keepFile = true;

    for (const line of lines) {
        // 🔹 Detect new file block
        if (line.startsWith("diff --git")) {
            keepFile = !shouldIgnoreFile(line, ignorePatterns);

            if (keepFile) {
                result.push(line);
            }
            continue;
        }

        if (!keepFile) continue;

        if (
            line.startsWith("index") ||
            line.startsWith("---") ||
            line.startsWith("+++") ||
            line.startsWith("@@") ||
            line.startsWith("+") ||
            line.startsWith("-")
        ) {
            result.push(line);
        }
    }

    return result.join("\n");
}

