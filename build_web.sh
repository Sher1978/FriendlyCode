#!/bin/bash

# 1. Build React App (Root)
echo "Building React Client..."
npm run build

# 2. Build Flutter App (Admin)
echo "Building Flutter Admin..."
cd admin
flutter build web --release --base-href /admin/ --no-tree-shake-icons
cd ..

# 3. Merge Artifacts
echo "Merging Artifacts..."
# Ensure dist/admin exists
if [ ! -d "dist/admin" ]; then
  mkdir -p dist/admin
fi

# Copy Flutter build to dist/admin
cp -R admin/build/web/* dist/admin/

echo "Build Complete! functionality served at:"
echo "Root: dist/index.html"
echo "Admin: dist/admin/index.html"
