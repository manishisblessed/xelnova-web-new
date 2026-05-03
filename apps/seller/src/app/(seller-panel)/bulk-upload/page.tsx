'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Info, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { apiBulkUploadProducts } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') || '/api/v1';

type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  parentId?: string | null;
  children?: CategoryNode[];
};

const TEMPLATE_HEADERS = [
  'name', 'price', 'categoryId', 'shortDescription', 'description',
  'compareAtPrice', 'brand', 'stock', 'images', 'highlights',
  'tags', 'metaTitle', 'metaDescription', 'hsnCode', 'gstRate', 'lowStockThreshold',
  'weight', 'dimensions',
  'productDescription', 'warrantyInfo', 'safetyInfo', 'regulatoryInfo',
  'featuresAndSpecs', 'materialsAndCare', 'itemDetails', 'additionalDetails',
];

const FIELD_DESCRIPTIONS: Record<string, string> = {
  name: 'Product name (required)',
  price: 'Selling price in INR, inclusive of GST (required)',
  categoryId: 'Category — exact category name, slug, or ID (required)',
  shortDescription: 'Brief product summary',
  description: 'Full product description',
  compareAtPrice: 'MRP / compare-at price in INR, inclusive of GST',
  brand: 'Brand name (must already exist & be approved)',
  stock: 'Available stock quantity',
  images: 'Public image URLs separated by | — upload to a host first (e.g. Cloudinary)',
  highlights: 'Key features separated by |',
  tags: 'Search tags separated by |',
  metaTitle: 'SEO title',
  metaDescription: 'SEO description',
  hsnCode: 'HSN/SAC code for GST',
  gstRate: 'GST % for this row — used with price columns (defaults to 18 if empty)',
  lowStockThreshold: 'Low stock alert threshold',
  weight: 'Weight in kg',
  dimensions: 'LxWxH in cm (e.g. 30x20x15)',
  productDescription: 'Detailed product description',
  warrantyInfo: 'Warranty details',
  safetyInfo: 'Safety information',
  regulatoryInfo: 'BIS/certifications info',
  featuresAndSpecs: 'JSON: {"key":"value",...}',
  materialsAndCare: 'JSON: {"key":"value",...}',
  itemDetails: 'JSON: {"key":"value",...}',
  additionalDetails: 'JSON: {"key":"value",...}',
};

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
  results: { row: number; status: 'ok' | 'error'; message?: string; productId?: string; sku?: string }[];
};

function flattenCategories(nodes: CategoryNode[], prefix = ''): { id: string; slug: string; label: string; name: string }[] {
  const out: { id: string; slug: string; label: string; name: string }[] = [];
  for (const n of nodes) {
    const label = prefix ? `${prefix} › ${n.name}` : n.name;
    out.push({ id: n.id, slug: n.slug, name: n.name, label });
    if (n.children?.length) out.push(...flattenCategories(n.children, label));
  }
  return out;
}

export default function BulkUploadPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFields, setShowFields] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState<{ id: string; slug: string; label: string; name: string }[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((r) => r.json())
      .then((res) => {
        const tree: CategoryNode[] = res.data ?? res ?? [];
        setCategories(flattenCategories(tree));
      })
      .catch(() => {
        // soft-fail — sellers can still upload using IDs/names they already know
      });
  }, []);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      // ignore — older browsers without clipboard permission
    }
  };

  const filteredCategories = categorySearch.trim()
    ? categories.filter((c) =>
        c.label.toLowerCase().includes(categorySearch.trim().toLowerCase()) ||
        c.slug.includes(categorySearch.trim().toLowerCase()),
      )
    : categories;

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
    const sampleCategoryName = categories[0]?.name || 'Electronics';
    const csv = TEMPLATE_HEADERS.join(',') + '\n' +
      [
        'Example Product', '199.99', sampleCategoryName, 'Short desc', '"Full, detailed description"',
        '299.99', 'BrandName', '100',
        'https://res.cloudinary.com/xelnova/image/upload/sample1.jpg|https://res.cloudinary.com/xelnova/image/upload/sample2.jpg',
        'Feature 1|Feature 2', 'tag1|tag2',
        'SEO Title', 'SEO Description', '1234', '18', '5',
        '0.5', '30x20x15',
        'Detailed product description here', '1 Year Manufacturer Warranty', '', '',
        '', '', '', '',
      ].join(',') + '\n';
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
      <DashboardHeader title="Bulk Product Upload" subtitle="Upload multiple products at once via CSV. SKU is auto-generated." />
      <div className="p-6 max-w-5xl">
        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download size={16} />
            Download Template
          </button>
          <button onClick={() => setShowCategories((s) => !s)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Info size={16} />
            {showCategories ? 'Hide' : 'Show'} Category List
          </button>
          <button onClick={() => setShowFields(!showFields)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Info size={16} />
            {showFields ? 'Hide' : 'Show'} Field Guide
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex gap-3">
          <ImageIcon size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <p className="font-semibold mb-1">How to add product images via CSV</p>
            <p>
              CSV files cannot contain image data — only links. Upload your photos to a public host first
              (e.g. Cloudinary, S3, Imgur, Google Drive with public-share link), then paste the resulting
              URLs into the <code className="bg-blue-100 px-1 rounded">images</code> column separated by{' '}
              <code className="bg-blue-100 px-1 rounded">|</code>. Example:
            </p>
            <code className="mt-1 block whitespace-pre-wrap text-[11px] bg-blue-100/60 border border-blue-200 rounded px-2 py-1 text-blue-800 break-all">
              https://res.cloudinary.com/.../front.jpg|https://res.cloudinary.com/.../back.jpg
            </code>
            <p className="mt-1.5 text-blue-800">
              The first URL becomes the listing thumbnail. Each URL must be publicly accessible (test it in
              an incognito window).
            </p>
          </div>
        </div>

        {showCategories && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Available categories</h3>
                <p className="text-xs text-gray-500">Use the <strong>Name</strong> or <strong>Slug</strong> in your CSV — both work in the <code>categoryId</code> column.</p>
              </div>
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories…"
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-violet-200 min-w-[180px]"
              />
            </div>
            {filteredCategories.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                {categories.length === 0 ? 'Loading categories…' : 'No matches.'}
              </p>
            ) : (
              <div className="max-h-72 overflow-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium text-gray-600">Name (use this in CSV)</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Slug</th>
                      <th className="px-3 py-2 font-medium text-gray-600 w-16">Copy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-gray-800">{c.label}</td>
                        <td className="px-3 py-1.5 font-mono text-violet-600">{c.slug}</td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() => copyToClipboard(c.name, c.id)}
                            className="inline-flex items-center gap-1 text-violet-600 hover:bg-violet-50 px-1.5 py-0.5 rounded transition-colors"
                            title="Copy name"
                          >
                            {copiedKey === c.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {showFields && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 overflow-hidden">
            <h3 className="text-sm font-semibold mb-3 text-gray-800">CSV Column Reference</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
              {TEMPLATE_HEADERS.map((h) => (
                <div key={h} className="flex items-baseline gap-2 text-xs">
                  <code className="font-mono text-violet-600 font-medium shrink-0">{h}</code>
                  <span className="text-gray-500 truncate">{FIELD_DESCRIPTIONS[h] || ''}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Notes:</strong> Only <code>name</code>, <code>price</code>, and <code>categoryId</code> are required. The <code>categoryId</code> column accepts the category <strong>name</strong>, <strong>slug</strong>, or internal ID — use the <em>Show Category List</em> button above to copy one. <strong>price</strong> and <strong>compareAtPrice</strong> are the amounts customers see — they are stored exactly as entered (no conversion). <code>gstRate</code> is recorded per product for invoice/tax reporting only and does not change the displayed price. SKU is auto-generated for every product. Use pipe (<code>|</code>) for multi-value fields. JSON fields use <code>{`{"key":"value"}`}</code> format. Return/cancellation policy is not per-row — it is configured by admin for the whole marketplace.
            </div>
          </motion.div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-violet-400 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 mb-1">Click to select a CSV file</p>
            <p className="text-xs text-gray-500">Supports shipping and Amazon-style info sections. Return and cancellation rules are set by the marketplace admin for all products.</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>

          {rows.length > 0 && !result && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-3">{rows.length} product(s) parsed from CSV</p>
              <div className="max-h-60 overflow-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Price</th>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Stock</th>
                      <th className="px-3 py-2 text-left">Brand</th>
                      <th className="px-3 py-2 text-left">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 30).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">{i + 1}</td>
                        <td className="px-3 py-1.5 truncate max-w-[200px]">{r.name}</td>
                        <td className="px-3 py-1.5">₹{r.price}</td>
                        <td className="px-3 py-1.5 text-violet-600 font-medium">Auto</td>
                        <td className="px-3 py-1.5">{r.stock || '0'}</td>
                        <td className="px-3 py-1.5">{r.brand || '—'}</td>
                        <td className="px-3 py-1.5">{r.weight ? `${r.weight}kg` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 30 && <p className="text-xs text-gray-400 mt-1">Showing first 30 of {rows.length} rows</p>}

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

            {result.results.filter((r) => r.status === 'ok').length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-auto mb-4">
                <table className="w-full text-xs">
                  <thead className="bg-green-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">SKU (Auto-generated)</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.filter((r) => r.status === 'ok').map((r) => (
                      <tr key={r.row} className="border-t">
                        <td className="px-3 py-1.5 font-medium">{r.row}</td>
                        <td className="px-3 py-1.5 font-mono text-violet-600">{r.sku || '—'}</td>
                        <td className="px-3 py-1.5"><span className="flex items-center gap-1 text-green-600"><CheckCircle size={12} />Created</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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
