import { useState } from 'react';
import {
  Upload, CheckCircle, XCircle, LayoutDashboard, ShoppingBag,
  MessageSquare, CreditCard, Star, LifeBuoy, Settings,
  FileText, ArrowUpRight, X, Loader2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

interface Summary {
  total_reviews: number;
  positive_count: number;
  negative_count: number;
  positive_rate: number;
  negative_rate: number;
  neutral_count: number;
  neutral_rate: number;
}

interface Category {
  name: string;
  count: number;
}

interface ReviewRecord {
  id: string;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  category: string;
  date: string;
  summary: string;
  aspects: { aspect: string; sentiment: string; snippet: string }[];
  slang_detected: { term: string; meaning: string }[];
  actionable_issue: string | null;
}

interface AnalysisData {
  filename: string;
  summary: Summary;
  categories: Category[];
  aspects: Category[];
  records: ReviewRecord[];
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ReviewRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || 'Analysis failed. Verify your document format.');
      }

      const result: AnalysisData = await response.json();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Server connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 flex font-sans">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-[#121d2f] bg-[#090f1a] p-5 flex flex-col justify-between hidden md:flex">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-lg">
              S
            </div>
            <span className="font-extrabold text-lg tracking-wide text-white">SENTI<span className="text-cyan-400">PULSE</span></span>
          </div>

          <nav className="space-y-1 text-sm font-medium">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#142238] text-cyan-400 border border-cyan-500/20">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-[#121d2f]">
              <ShoppingBag className="w-4 h-4" /> Feedback Feed
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-[#121d2f]">
              <MessageSquare className="w-4 h-4" /> Review Queue
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-[#121d2f]">
              <CreditCard className="w-4 h-4" /> Products
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-[#121d2f]">
              <Star className="w-4 h-4" /> Ratings
            </button>
          </nav>
        </div>

        <div className="space-y-1 text-sm text-slate-400">
          <button className="w-full flex items-center gap-3 px-3 py-2 hover:text-white"><LifeBuoy className="w-4 h-4" /> Support</button>
          <button className="w-full flex items-center gap-3 px-3 py-2 hover:text-white"><Settings className="w-4 h-4" /> Settings</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
        {/* Top Welcome Card */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900/60 via-[#101b2e] to-[#0a1120] border border-cyan-500/20 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Sentiment Analytics Console
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload customer reviews via PDF, DOCX, or CSV to generate automated sentiment summaries.
            </p>
          </div>
          {data && (
            <button
              onClick={() => setData(null)}
              className="px-4 py-2 bg-[#121f35] hover:bg-[#182a48] text-xs font-semibold rounded-lg border border-cyan-500/40 text-cyan-300"
            >
              Analyze Another Document
            </button>
          )}
        </div>

        {/* Step 1: Document Upload */}
        {!data && (
          <div className="bg-[#0b1322] border border-[#17263c] rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Upload Feedback File</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Select a .PDF, .DOCX, or .CSV product review export to process sentiment ratings and categorization.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <input
                type="file"
                accept=".pdf,.docx,.csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#192b45] file:text-cyan-400 hover:file:bg-[#203758] cursor-pointer bg-[#0e192c] rounded-lg border border-[#1b2f4c] p-1"
              />
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-lg disabled:opacity-40 transition flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Start Analysis</>}
              </button>
            </div>

            {error && (
              <p className="text-rose-400 text-xs bg-rose-950/40 border border-rose-800/50 px-3 py-1.5 rounded-md">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Step 2: Results Display */}
        {data && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-[#0b1322] border border-[#17263c] rounded-xl p-5">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Analyzed</span>
                <div className="text-3xl font-extrabold mt-2 text-white">{data.summary.total_reviews}</div>
                <div className="text-xs text-slate-500 mt-1 truncate">File: {data.filename}</div>
              </div>

              <div className="bg-[#0b1322] border border-[#17263c] rounded-xl p-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Positive Sentiment</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold mt-2 text-emerald-400">{data.summary.positive_rate}%</div>
                <div className="text-xs text-slate-500 mt-1">{data.summary.positive_count} snippets classified</div>
              </div>

              <div className="bg-[#0b1322] border border-[#17263c] rounded-xl p-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-rose-400 uppercase tracking-wider font-semibold">Negative Sentiment</span>
                  <XCircle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-3xl font-extrabold mt-2 text-rose-400">{data.summary.negative_rate}%</div>
                <div className="text-xs text-slate-500 mt-1">{data.summary.negative_count} snippets classified</div>
              </div>

              <div className="bg-[#0b1322] border border-[#17263c] rounded-xl p-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Neutral Sentiment</span>
                </div>
                <div className="text-3xl font-extrabold mt-2 text-amber-300">{data.summary.neutral_rate}%</div>
                <div className="text-xs text-slate-500 mt-1">{data.summary.neutral_count} snippets classified</div>
              </div>
            </div>

            {/* Category Breakdown Bars */}
            <div className="bg-[#0b1322] border border-[#17263c] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Topic Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {data.categories.map((cat, i) => (
                  <div key={i} className="bg-[#0e1828] border border-[#192b45] p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-xs text-slate-400 truncate">{cat.name}</span>
                    <div className="text-xl font-bold text-cyan-400 mt-2">{cat.count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0b1322] border border-[#17263c] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">Aspect-Based Sentiment</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {data.aspects.map((aspect) => (
                  <div key={aspect.name} className="bg-[#0e1828] border border-[#192b45] p-3 rounded-lg">
                    <span className="text-[11px] leading-tight text-slate-400 block">{aspect.name}</span>
                    <div className="text-xl font-bold text-cyan-400 mt-2">{aspect.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Reviews Table */}
            <div className="bg-[#0b1322] border border-[#17263c] rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#17263c] flex justify-between items-center">
                <h2 className="text-base font-bold text-white tracking-wide">Extracted Review Records</h2>
                <span className="text-xs text-slate-500">Showing {data.records.length} items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0e1828] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#17263c]">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Topic</th>
                      <th className="px-4 py-3">Text Snippet</th>
                      <th className="px-4 py-3">Sentiment</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132034]">
                    {data.records.map((record) => (
                      <tr key={record.id} className="hover:bg-[#0f1b2d] transition">
                        <td className="px-4 py-3 font-mono text-cyan-400 font-semibold">{record.id}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{record.category}</td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-200">{record.text}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              record.sentiment === 'positive'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : record.sentiment === 'negative'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {record.sentiment}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">{record.confidence}%</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
                          >
                            Details <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Side panel for full review inspection */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
            <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-[#0c1524] border-l border-cyan-500/30 p-6 space-y-5 shadow-2xl">
              <button
                onClick={() => setSelectedRecord(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white"
                aria-label="Close review details"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 pr-8">
                <span className="font-mono text-cyan-400 font-bold">{selectedRecord.id}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedRecord.sentiment === 'positive'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : selectedRecord.sentiment === 'negative'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {selectedRecord.sentiment} ({selectedRecord.confidence}%)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Topic category</span>
                  <div className="text-sm text-slate-200 font-medium">{selectedRecord.category}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Confidence</span>
                  <div className="text-sm text-cyan-300 font-medium">{selectedRecord.confidence}%</div>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 block mb-1">Summary</span>
                <p className="text-sm text-slate-200 leading-relaxed">{selectedRecord.summary}</p>
              </div>

              <div>
                <span className="text-xs text-slate-500 block mb-1">Full extracted content</span>
                <p className="text-sm bg-[#080d16] p-3 rounded-lg border border-[#17253b] text-slate-300 leading-relaxed">
                  "{selectedRecord.text}"
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 block mb-2">Detected aspects</span>
                <div className="space-y-2">
                  {selectedRecord.aspects.map((aspect, index) => (
                    <div key={`${aspect.aspect}-${index}`} className="bg-[#101c2d] border border-[#1b2f4c] rounded-lg p-3">
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="font-semibold text-cyan-300">{aspect.aspect}</span>
                        <span className="uppercase text-slate-400">{aspect.sentiment}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{aspect.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRecord.slang_detected.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 block mb-2">Slang / Hinglish detected</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.slang_detected.map((item) => (
                      <span key={item.term} className="text-xs px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">
                        {item.term}: {item.meaning}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <span className="text-xs text-amber-300 block mb-1">Actionable issue</span>
                <p className="text-sm text-slate-300">{selectedRecord.actionable_issue || 'No explicit issue detected.'}</p>
              </div>

              <div className="text-right pt-2">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-1.5 bg-[#17263c] hover:bg-[#203656] text-xs font-semibold rounded-lg text-white"
                >
                  Close
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}