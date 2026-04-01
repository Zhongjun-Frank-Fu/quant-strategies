#!/usr/bin/env python3
"""Convert models_data_v2.js to TypeScript files."""

data = open('/Users/benwozhiyue/Desktop/项目/quant-strategies/web/models_data_v2.js', encoding='utf-8').read()

# Extract CATEGORIES
cat_start = data.find('const CATEGORIES = ') + len('const CATEGORIES = ')
cat_end = data.find(';\n\nconst MODELS')
cats = data[cat_start:cat_end]

# Extract MODELS
mod_start = data.find('const MODELS = ') + len('const MODELS = ')
mod_end = data.rfind(';')
mods = data[mod_start:mod_end]

with open('/Users/benwozhiyue/Desktop/项目/quant-strategies/vite-app/src/data/categories.ts', 'w', encoding='utf-8') as f:
    f.write('import type { Category } from "../types";\n\n')
    f.write('export const CATEGORIES: Category[] = ')
    f.write(cats)
    f.write(';\n')

with open('/Users/benwozhiyue/Desktop/项目/quant-strategies/vite-app/src/data/models.ts', 'w', encoding='utf-8') as f:
    f.write('import type { Model } from "../types";\n\n')
    f.write('export const MODELS: Model[] = ')
    f.write(mods)
    f.write(';\n')

print('Done: categories.ts and models.ts written')
