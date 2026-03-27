// ─── Record Field Types ──────────────────────────────────────────────────────

export type FieldType = 'text' | 'number' | 'email' | 'url' | 'date' | 'select' | 'boolean' | 'currency' | 'list' | 'richtext';

export interface FieldDef {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[];     // for 'select' type
  defaultValue?: unknown;
}

// ─── Record Type (template definition) ───────────────────────────────────────

export interface RecordTypeDef {
  id: string;
  name: string;           // e.g. "Account", "Company", "Invoice"
  icon: string;           // emoji or letter
  color: string;          // tailwind bg class
  fields: FieldDef[];
  layoutTemplate?: LayoutTemplate;  // custom block layout for viewing records
  createdAt: string;
}

// ─── Layout Template ─────────────────────────────────────────────────────────
// Defines how a record is displayed using blocks.
// Each template block maps to record fields.

export interface TemplateBlock {
  id: string;
  blockType: 'stat' | 'text' | 'table' | 'chart' | 'list';
  title: string;
  fieldMapping: Record<string, string>;  // block config key → field ID
  // e.g. { "statValue": "balance", "statLabel": "name" }
  position: { x: number; y: number; w: number; h: number };
}

export interface LayoutTemplate {
  blocks: TemplateBlock[];
}

// ─── Record (actual data) ────────────────────────────────────────────────────

export interface DataRecord {
  id: string;
  typeId: string;          // which RecordTypeDef this belongs to
  data: { [fieldId: string]: unknown };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;      // agent ID or 'manual'
}

// ─── Default field for auto-layout ───────────────────────────────────────────

export function autoLayoutFromFields(fields: FieldDef[]): LayoutTemplate {
  const blocks: TemplateBlock[] = [];
  let x = 0;
  let y = 0;

  for (const field of fields) {
    const id = `tmpl-${field.id}`;

    switch (field.type) {
      case 'number':
      case 'currency':
        blocks.push({
          id, blockType: 'stat', title: field.name,
          fieldMapping: { statValue: field.id, statLabel: `"${field.name}"` },
          position: { x, y, w: 2, h: 2 },
        });
        x += 2;
        break;

      case 'richtext':
        blocks.push({
          id, blockType: 'text', title: field.name,
          fieldMapping: { textContent: field.id },
          position: { x, y, w: 4, h: 3 },
        });
        x += 4;
        break;

      case 'list':
        blocks.push({
          id, blockType: 'list', title: field.name,
          fieldMapping: { listItems: field.id },
          position: { x, y, w: 3, h: 3 },
        });
        x += 3;
        break;

      default:
        blocks.push({
          id, blockType: 'stat', title: field.name,
          fieldMapping: { statValue: field.id, statLabel: `"${field.name}"` },
          position: { x, y, w: 3, h: 2 },
        });
        x += 3;
        break;
    }

    if (x >= 12) { x = 0; y += 3; }
  }

  return { blocks };
}
