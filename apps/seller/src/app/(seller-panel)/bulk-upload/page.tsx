'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { apiBulkUploadProducts } from '@/lib/api';

const TEMPLATE_HEADERS = [
  'name', 'price', 'categoryId', 'shortDescription', 'description',
  'compareAtPrice', 'brand', 'stock', 'sku', 'images', 'highlights',
  'tags', 'metaTitle', 'metaDescription', 'hsnCode', 'gstRate', 'lowStockThreshold',
];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { if (values[i]) row[h] = values[i]; });
    return row;
  });
}

type UploadResult = {
  total: number;
  success: number;
  failed: number;
  results: { row: number; status: 'ok' | 'error'; message?: string; productId?: string }[];
};

export default function BulkUploadPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError('No data rows found. Make sure your CSV has headers and at least one data row.');
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (rows.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const res = await apiBulkUploadProducts(rows) as UploadResult;
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADERS.join(',') + '\n' +
      'Example Product,199.99,CATEGORY_ID_HERE,Short desc,Full description,299.99,BrandName,100,SKU-001,https://img1.jpg|https://img2.jpg,Feature 1|Feature 2,tag1|tag2,SEO Title,SEO Description,1234,18,5\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-upload-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <DashboardHeader title="Bulk Product Upload" subtitle="Upload multiple products at once via CSV" />
      <div className="p-6 max-w-4xl">
        <div className="flex gap-3 mb-6">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download size={16} />
            Download Template
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-violet-400 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 mb-1">Click to select a CSV file</p>
            <p className="text-xs text-gray-500">Use pipe (|) to separate multiple values in images, highlights, and tags columns</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>

          {rows.length > 0 && !result && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-3">{rows.length} product(s) parsed from CSV</p>
              <div className="max-h-48 overflow-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Price</th>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">{i + 1}</td>
                        <td className="px-3 py-1.5 truncate max-w-[200px]">{r.name}</td>
                        <td className="px-3 py-1.5">{r.price}</td>
                        <td className="px-3 py-1.5">{r.sku || 'Auto'}</td>
                        <td className="px-3 py-1.5">{r.stock || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 20 && <p className="text-xs text-gray-400 mt-1">Showing first 20 of {rows.length} rows</p>}

              <button onClick={handleUpload} disabled={uploading} className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                <Upload size={16} />
                {uploading ? 'Uploading...' : `Upload ${rows.length} Products`}
              </button>
            </div>
          )}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700 text-sm"><AlertTriangle size={16} />{error}</div>
          </motion.div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Upload Results</h3>
            <div className="flex gap-4 mb-4">
              <div className="bg-green-50 rounded-xl px-4 py-3 flex-1">
                <div className="text-2xl font-bold text-green-700">{result.success}</div>
                <div className="text-xs text-green-600">Successful</div>
              </div>
              <div className="bg-red-50 rounded-xl px-4 py-3 flex-1">
                <div className="text-2xl font-bold text-red-700">{result.failed}</div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex-1">
                <div className="text-2xl font-bold text-gray-700">{result.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>

            {result.results.filter((r) => r.status === 'error').length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.filter((r) => r.status === 'error').map((r) => (
                      <tr key={r.row} className="border-t">
                        <td className="px-3 py-1.5 font-medium">{r.row}</td>
                        <td className="px-3 py-1.5 text-red-600">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button onClick={() => { setResult(null); setRows([]); if (fileRef.current) fileRef.current.value = ''; }} className="mt-4 px-4 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
              Upload Another File
            </button>
          </motion.div>
        )}
      </div>
    </>
  );
}
