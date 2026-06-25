import os

file_path = r'c:\MY_PROJECTS\HP\index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('card shadow-sm border-0 h-100 py-1" style="border-radius: 16px;', 'card shadow-sm border-0" style="border-radius: 12px;')
content = content.replace('card-body d-flex align-items-center', 'card-body p-2 px-3 d-flex align-items-center')
content = content.replace('width: 48px; height: 48px;', 'width: 36px; height: 36px;')
content = content.replace('rounded-circle p-2 me-3', 'rounded-circle p-1 me-3')
content = content.replace('fs-3"', 'fs-5"')
content = content.replace('fs-3 theme-icon', 'fs-5 theme-icon')
content = content.replace('fs-3" style', 'fs-5" style')
content = content.replace('card-title fw-bold mb-1"', 'card-title fw-bold mb-0" style="font-size: 15px;"')
content = content.replace('card-text text-muted small mb-0"', 'card-text text-muted mb-0" style="font-size: 11px; margin-top: 2px;"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated index.html successfully')
