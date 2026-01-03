import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { CanonicalSchema } from '@/types';
import { usePreferencesStore } from '@/stores/history';

const defaultSchema: CanonicalSchema = {
  name: 'My Schema',
  version: '1.0.0',
  description: 'Custom schema definition',
  columns: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'Unique identifier',
    },
    {
      name: 'name',
      type: 'string',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: false,
      nullable: true,
    },
  ],
  errorPolicy: 'flag',
  strict: false,
};

interface SchemaEditorProps {
  initialValue?: CanonicalSchema;
  onChange: (schema: CanonicalSchema | null, isValid: boolean) => void;
}

export function SchemaEditor({ initialValue, onChange }: SchemaEditorProps) {
  const { theme } = usePreferencesStore();
  const [value, setValue] = useState(() =>
    JSON.stringify(initialValue || defaultSchema, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const editorTheme = theme === 'dark' ? 'vs-dark' : theme === 'light' ? 'light' : 'vs-dark';

  useEffect(() => {
    try {
      const parsed = JSON.parse(value);
      // Basic validation
      if (!parsed.name || typeof parsed.name !== 'string') {
        throw new Error('Schema must have a name');
      }
      if (!Array.isArray(parsed.columns) || parsed.columns.length === 0) {
        throw new Error('Schema must have at least one column');
      }
      for (const col of parsed.columns) {
        if (!col.name || !col.type) {
          throw new Error('Each column must have a name and type');
        }
      }
      setParseError(null);
      onChange(parsed as CanonicalSchema, true);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
      onChange(null, false);
    }
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden">
        <Editor
          height="300px"
          defaultLanguage="json"
          value={value}
          onChange={(v) => setValue(v || '')}
          theme={editorTheme}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
      {parseError && (
        <p className="text-sm text-destructive">{parseError}</p>
      )}
    </div>
  );
}
