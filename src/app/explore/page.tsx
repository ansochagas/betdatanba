"use client";

import { useState, useEffect } from "react";

interface APIResult {
  endpoint: string;
  url: string;
  status: number | string;
  available: boolean;
  error?: string;
  dataStructure?: any;
  sampleData?: any;
  recordCount?: number | string;
}

interface ExplorationData {
  summary: {
    totalEndpoints: number;
    availableEndpoints: number;
    failedEndpoints: number;
    timestamp: string;
    apiTokenConfigured: boolean;
  };
  results: APIResult[];
  recommendations: string[];
}

export default function ExplorePage() {
  const [data, setData] = useState<ExplorationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<APIResult | null>(null);

  useEffect(() => {
    fetchExplorationData();
  }, []);

  const fetchExplorationData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/explore");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const explorationData = await response.json();
      setData(explorationData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl">Explorando API BETSAPI...</p>
          <p className="text-gray-400 mt-2">Isso pode levar alguns segundos</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="card-modern p-8 text-center">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-4">Erro na Exploração</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={fetchExplorationData}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                BETSAPI Explorer
              </h1>
              <p className="text-gray-400">Exploração dos endpoints de CS:GO</p>
            </div>
            <button
              onClick={fetchExplorationData}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              🔄 Recarregar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <div className="card-modern p-6 text-center">
            <div className="text-3xl font-bold text-blue-400">
              {data.summary.totalEndpoints}
            </div>
            <div className="text-sm text-gray-400">Total de Endpoints</div>
          </div>
          <div className="card-modern p-6 text-center">
            <div className="text-3xl font-bold text-green-400">
              {data.summary.availableEndpoints}
            </div>
            <div className="text-sm text-gray-400">Funcionais</div>
          </div>
          <div className="card-modern p-6 text-center">
            <div className="text-3xl font-bold text-red-400">
              {data.summary.failedEndpoints}
            </div>
            <div className="text-sm text-gray-400">Com Falha</div>
          </div>
          <div className="card-modern p-6 text-center">
            <div
              className={`text-3xl font-bold ${
                data.summary.apiTokenConfigured
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {data.summary.apiTokenConfigured ? "✅" : "❌"}
            </div>
            <div className="text-sm text-gray-400">Token Configurado</div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="card-modern p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📋 Recomendações</h2>
          <div className="space-y-2">
            {data.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-blue-400 mt-1">•</span>
                <span className="text-gray-300">{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.results.map((result, index) => (
            <div
              key={index}
              className={`card-modern p-6 cursor-pointer transition-all hover:scale-105 ${
                result.available ? "border-green-500/30" : "border-red-500/30"
              }`}
              onClick={() => setSelectedResult(result)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{result.endpoint}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    result.available
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {result.available ? "✅" : "❌"}
                </span>
              </div>

              <p className="text-sm text-gray-400 mb-3">{result.url}</p>

              <div className="text-xs text-gray-500">
                Status: <span className="text-blue-400">{result.status}</span>
              </div>

              {result.recordCount && result.recordCount !== "N/A" && (
                <div className="text-xs text-gray-500 mt-1">
                  Registros:{" "}
                  <span className="text-yellow-400">{result.recordCount}</span>
                </div>
              )}

              {result.error && (
                <div className="text-xs text-red-400 mt-2 truncate">
                  {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal for detailed view */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-modern max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{selectedResult.endpoint}</h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-400 mt-1">{selectedResult.url}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                <div
                  className={`inline-block px-3 py-1 rounded text-sm font-bold ${
                    selectedResult.available
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {selectedResult.available ? "Disponível" : "Indisponível"} (
                  {selectedResult.status})
                </div>
              </div>

              {/* Error */}
              {selectedResult.error && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-400">Erro</h3>
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                    <code className="text-red-400 text-sm">
                      {selectedResult.error}
                    </code>
                  </div>
                </div>
              )}

              {/* Data Structure */}
              {selectedResult.dataStructure && (
                <div>
                  <h3 className="font-semibold mb-2">Estrutura dos Dados</h3>
                  <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto max-h-60">
                    {JSON.stringify(selectedResult.dataStructure, null, 2)}
                  </pre>
                </div>
              )}

              {/* Sample Data */}
              {selectedResult.sampleData && (
                <div>
                  <h3 className="font-semibold mb-2">Dados de Exemplo</h3>
                  <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto max-h-60">
                    {JSON.stringify(selectedResult.sampleData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
