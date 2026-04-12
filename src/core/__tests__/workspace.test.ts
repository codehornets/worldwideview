import { expect, test, describe } from "vitest";
import { readFileSync, globSync } from "fs";
import { join } from "path";

describe("Monorepo Workspace Integrity", () => {
    test("all local workspace packages strictly use workspace:* protocol", () => {
        // Find all package.json in packages/
        // __dirname is dist/core/__tests__ when transpiled or src/core/__tests__ when running tsx/vitest natively
        const rootDir = process.cwd(); // vitest runs from workspace root
        
        const packageJsonFiles = [
             "package.json",
             ...globSync("packages/**/package.json", { cwd: rootDir, ignore: ["**/node_modules/**"] })
        ];

        let failedFiles: string[] = [];

        for (const file of packageJsonFiles) {
            const content = readFileSync(join(rootDir, file), "utf-8");
            const pkg = JSON.parse(content);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
            
            for (const [dep, version] of Object.entries(deps)) {
                // If it's an internal package linking to "@worldwideview/..."
                if (dep.startsWith("@worldwideview/")) {
                    if (version === "*") {
                        failedFiles.push(`${file} uses "*" for ${dep}. It MUST use "workspace:*"`);
                    }
                }
            }
        }

        // We expect zero packages to be violating this rule
        expect(failedFiles).toEqual([]);
    });
});
