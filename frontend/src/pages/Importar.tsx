import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Empresa, Unidade, Preview } from "@/lib/api";

const BASE_DIR = import.meta.env.VITE_BASE_DIR || "B:\\\\NOVO00_Nossos_Clientes";

export default function Importar() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [pathsText, setPathsText] = useState<string>("");
  const [preview, setPreview] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(false);

    useEffect(() => {
    api.listarEmpresas().then(setEmpresas).catch((e: unknown) => alert(String(e)));
    }, []);

    useEffect(() => {
    if (!empresaId) { setUnidades([]); return; }
    api.listarUnidades(Number(empresaId)).then(setUnidades).catch((e: unknown) => alert(String(e)));
    }, [empresaId]);

  const arquivos = useMemo(
    () => pathsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    [pathsText]
  );

  async function handlePreview() {
    if (!unidadeId || arquivos.length === 0) return;
    setLoading(true);
    try {
      const data = await api.preview(BASE_DIR, Number(unidadeId), arquivos);
      setPreview(data);
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleAplicar() {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const res = await api.aplicar(preview);
      console.log(res);
      alert("Arquivos movidos/renomeados. Veja o console para detalhes.");
      setPreview([]);
      setPathsText("");
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="bg-white/5 border rounded-xl p-4 space-y-4">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm block mb-1">Empresa</label>
            <select
              className="w-full border rounded-lg p-2 bg-transparent"
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
            >
              <option value="">Selecione</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} - {e.id_empresa}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm block mb-1">Unidade</label>
            <select
              className="w-full border rounded-lg p-2 bg-transparent"
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
              disabled={!empresaId}
            >
              <option value="">{empresaId ? "Selecione" : "Escolha a empresa primeiro"}</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} - {u.id_unidade}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm block mb-1">Caminhos absolutos (um por linha)</label>
            <textarea
              className="w-full border rounded-lg p-2 h-28 bg-transparent"
              placeholder={`Ex.:\nC:\\Temp\\FAT-2025-01.pdf\nC:\\Temp\\NE-CP-2025-02.pdf`}
              value={pathsText}
              onChange={(e) => setPathsText(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
            onClick={handlePreview}
            disabled={loading || !unidadeId || arquivos.length === 0}
          >
            {loading ? "Processando..." : "Pré-visualizar"}
          </button>

          <button
            className="px-4 py-2 rounded-lg border disabled:opacity-50"
            onClick={handleAplicar}
            disabled={loading || preview.length === 0}
          >
            Aplicar movimentação
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="bg-white/5 border rounded-xl p-4">
          <div className="text-sm font-medium mb-2">Prévia</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Origem</th>
                  <th className="py-2 pr-4">Destino</th>
                  <th className="py-2 pr-4">Pasta</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">OK?</th>
                  <th className="py-2 pr-4">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4">{p.origem}</td>
                    <td className="py-2 pr-4">{p.destino}</td>
                    <td className="py-2 pr-4">{p.pasta_relativa}</td>
                    <td className="py-2 pr-4">{p.tipo_detectado ?? "-"}</td>
                    <td className="py-2 pr-4">{p.valido ? "✅" : "⚠️"}</td>
                    <td className="py-2 pr-4">{p.motivo ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
