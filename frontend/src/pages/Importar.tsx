import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, type Empresa, type Unidade, type Preview } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const BASE_DIR = import.meta.env.VITE_BASE_DIR || "B:\\\\NOVO00_Nossos_Clientes";

export default function Importar() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [pathsText, setPathsText] = useState<string>("");
  const [preview, setPreview] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listarEmpresas().then(setEmpresas).catch((e) => alert(String(e)));
  }, []);

  useEffect(() => {
    if (!empresaId) { setUnidades([]); return; }
    api.listarUnidades(Number(empresaId)).then(setUnidades).catch((e) => alert(String(e)));
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
    } catch (e) { alert(String(e)); }
    finally { setLoading(false); }
  }

  async function handleAplicar() {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const res = await api.aplicar(preview);
      console.log(res);
      alert("Arquivos movidos/renomeados.");
      setPreview([]);
      setPathsText("");
    } catch (e) { alert(String(e)); }
    finally { setLoading(false); }
  }

  // File picker (navegador NÃO expõe caminho absoluto; serve só para listar nomes)
  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).map(f => f.name);
    if (files.length) {
      alert("No navegador, não temos caminho absoluto; cole manualmente os caminhos no campo.\nArquivos escolhidos: \n- " + files.join("\n- "));
    }
    e.target.value = ""; // reseta seleção
  }

  return (
    <div className="p-6 grid gap-4">
      <Card>
        <CardContent className="p-4 grid gap-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <label className="text-sm">Empresa</label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.nome} - {e.id_empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1">
              <label className="text-sm">Unidade</label>
              <Select value={unidadeId} onValueChange={setUnidadeId} disabled={!empresaId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nome} - {u.id_unidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="text-sm">Caminhos absolutos (um por linha)</label>
              <Textarea
                className="mt-1"
                placeholder={`Ex.:\nC:\\Temp\\FAT-2025-01.pdf\nC:\\Temp\\NE-CP-2025-02.pdf`}
                rows={5}
                value={pathsText}
                onChange={(e) => setPathsText(e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Selecionar arquivos (opcional)
                </Button>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={onPickFiles}
                  aria-label="Selecionar múltiplos arquivos"
                />
                <span className="text-xs text-muted-foreground">
                  Dica: no navegador não temos o caminho completo; cole manualmente no campo acima.
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePreview} disabled={loading || !unidadeId || arquivos.length === 0}>
              {loading ? "Processando..." : "Pré-visualizar"}
            </Button>
            <Button variant="secondary" onClick={handleAplicar} disabled={loading || preview.length === 0}>
              Aplicar movimentação
            </Button>
          </div>

          <Separator className="my-2" />

          {preview.length > 0 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
