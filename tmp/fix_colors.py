import os

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('CupertinoColors.activeOrange', 'AppColors.accentOrange')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

root = r'c:\Sher_AI_Studio\projects\FriendlyCode\admin\lib'
count = 0
for dirpath, dirnames, filenames in os.walk(root):
    for filename in filenames:
        if filename.endswith('.dart'):
            if replace_in_file(os.path.join(dirpath, filename)):
                count += 1

print(f"Fixed {count} files.")
