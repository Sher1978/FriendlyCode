import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

function run(command, cwd = rootDir) {
    console.log(`Running: ${command} in ${cwd}`);
    execSync(command, { stdio: 'inherit', cwd });
}

try {
    // 1. Build React App
    console.log('--- Building React Client ---');
    run('npm run build');

    // 2. Build Flutter App
    console.log('--- Building Flutter Admin ---');
    const adminDir = path.join(rootDir, 'admin');
    run('flutter build web --release --no-tree-shake-icons --base-href /admin/', adminDir);

    // 3. Merge Artifacts
    console.log('--- Merging Artifacts ---');
    const distAdminDir = path.join(rootDir, 'dist', 'admin');

    if (!fs.existsSync(distAdminDir)) {
        fs.mkdirSync(distAdminDir, { recursive: true });
    }

    const flutterBuildDir = path.join(adminDir, 'build', 'web');

    // Copy files recursively
    function copyRecursiveSync(src, dest) {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats.isDirectory();
        if (isDirectory) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest);
            }
            fs.readdirSync(src).forEach((childItemName) => {
                copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    }

    console.log(`Copying from ${flutterBuildDir} to ${distAdminDir}`);
    copyRecursiveSync(flutterBuildDir, distAdminDir);

    console.log('Build and Merge Complete!');
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}
