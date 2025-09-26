import React, { useEffect, useMemo, useState } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import type { Editor as TinyMCEEditor } from 'tinymce'
import { toast } from 'sonner'
import { Loader2, Mail, RefreshCw, Search, Users, Plus, X } from 'lucide-react'

import { api, type EmailConfig, type EmailSendRequest, type EmpresaEmail } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import 'tinymce/tinymce'
import 'tinymce/icons/default'
import 'tinymce/themes/silver'
import 'tinymce/models/dom/model'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/table'
import 'tinymce/plugins/code'
import 'tinymce/plugins/wordcount'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/visualblocks'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/image'
import 'tinymce/plugins/insertdatetime'
import 'tinymce/plugins/pagebreak'
import 'tinymce/plugins/codesample'
import 'tinymce/plugins/directionality'
import 'tinymce/plugins/anchor'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/visualchars'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/quickbars'
import 'tinymce/skins/ui/oxide/skin.min.css'
import 'tinymce/skins/ui/oxide/content.min.css'
import 'tinymce/skins/content/default/content.min.css'
import '../styles/tinymce-dark.css'

const EmailCompose: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [empresas, setEmpresas] = useState<EmpresaEmail[]>([])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null)
  const [senderEmail, setSenderEmail] = useState('')
  const [manualRecipients, setManualRecipients] = useState<string[]>([])
  const [removedRecipients, setRemovedRecipients] = useState<string[]>([])
  const [manualEmailInput, setManualEmailInput] = useState('')

  const normalizeEmail = (value: string) => value.trim().toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const editorInit = useMemo(() => {
    const toolbarRows = [
      'undo redo | fontfamily fontsize | formatselect styleselect | forecolor backcolor removeformat',
      'bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | outdent indent | bullist numlist | outlookChecklist',
      'link unlink | image table | outlookHr pagebreak insertdatetime anchor | charmap codesample | searchreplace',
      'ltr rtl | outlookPastePlain | fullscreen preview | outlookExportWord outlookExportPdf | outlookSpellcheck',
    ].join('\n');

    const colorMap = [
      'ffffff', 'Branco',
      'f1f5f9', 'Cinza muito claro',
      'e2e8f0', 'Cinza claro',
      'cbd5e1', 'Cinza médio',
      '64748b', 'Cinza escuro',
      '334155', 'Ardósia',
      '1e293b', 'Ardósia escuro',
      '0f172a', 'Quase preto',
      '3b82f6', 'Azul',
      '60a5fa', 'Azul claro',
      '1e40af', 'Azul escuro',
      '10b981', 'Verde',
      '34d399', 'Verde claro',
      'f59e0b', 'Âmbar',
      'fbbf24', 'Amarelo',
      'ef4444', 'Vermelho',
      'f87171', 'Vermelho claro',
    ];

    const styleFormats = [
      { title: 'Texto padrao', block: 'p' },
      { title: 'Sem espaco', block: 'p', styles: { marginBottom: '4px', lineHeight: '1.15' } },
      { title: 'Espacamento confortavel', block: 'p', styles: { marginBottom: '12px', lineHeight: '1.4' } },
      { title: 'Espacamento amplo', block: 'p', styles: { marginBottom: '18px', lineHeight: '1.6' } },
      { title: 'Nota informativa', block: 'p', classes: 'outlook-note' },
      { title: 'Destaque', inline: 'span', classes: 'outlook-highlight' },
    ];

    return {
      skin: 'oxide-dark',
      content_css: false,
      height: 480,
      menubar: false,
      statusbar: true,
      branding: false,
      toolbar_sticky: true,
      resize: false,
      plugins: [
        'advlist',
        'autolink',
        'lists',
        'link',
        'table',
        'code',
        'wordcount',
        'charmap',
        'visualblocks',
        'preview',
        'image',
        'insertdatetime',
        'pagebreak',
        'codesample',
        'directionality',
        'anchor',
        'searchreplace',
        'visualchars',
        'fullscreen',
        'quickbars',
      ],
      toolbar: toolbarRows,
      font_family_formats:
        'Calibri=Calibri,Arial,Helvetica,sans-serif;Segoe UI="Segoe UI",Tahoma,Geneva,Verdana,sans-serif;Arial=Arial,Helvetica,sans-serif;Verdana=Verdana,Geneva,sans-serif;Times New Roman="Times New Roman",Times,serif;Georgia=Georgia,serif;Courier New="Courier New",Courier,monospace',
      font_size_formats: '10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt',
      block_formats: 'Paragrafo=p;Cabecalho 1=h1;Cabecalho 2=h2;Cabecalho 3=h3;Citacao=blockquote;Codigo=pre',
      style_formats: styleFormats,
      content_style: `
        body { 
          font-family: Calibri, Arial, Helvetica, sans-serif; 
          font-size: 12pt; 
          color: #e2e8f0; 
          line-height: 1.4; 
          background-color: #1e293b; 
          margin: 0; 
          padding: 16px; 
          border: none;
          outline: none;
        }
        * { box-sizing: border-box; }
        .mce-content-body { 
          background-color: #1e293b !important; 
          border: none !important;
          outline: none !important;
        }
        .mce-edit-area { 
          border: none !important; 
          background-color: #1e293b !important;
        }
        table { border-collapse: collapse; width: 100%; }
        table th, table td { border: 1px solid #475569; padding: 6px; color: #e2e8f0; }
        ul.task-list { list-style: none; padding-left: 1.4em; margin: 0; }
        ul.task-list li { position: relative; margin: 4px 0; padding-left: 0.35em; }
        ul.task-list li:before { content: '\\2610'; position: absolute; left: -1.4em; color: #3b82f6; font-size: 1.05em; }
        ul.task-list li.task-complete:before { content: '\\2611'; color: #10b981; }
        .outlook-note { background: #1e3a8a; border-left: 4px solid #3b82f6; padding: 8px 12px; color: #dbeafe; }
        .outlook-highlight { background-color: #fbbf24; color: #1f2937; }
        hr { border-top: 1px solid #475569; }
        h1, h2, h3, h4, h5, h6 { color: #f1f5f9; }
        blockquote { 
          background: #334155; 
          border-left: 4px solid #64748b; 
          padding: 12px 16px; 
          margin: 16px 0; 
          color: #cbd5e1; 
        }
        code { 
          background: #0f172a; 
          color: #22d3ee; 
          padding: 2px 4px; 
          border-radius: 3px; 
        }
        pre { 
          background: #0f172a; 
          color: #e2e8f0; 
          padding: 12px; 
          border-radius: 6px; 
          border: 1px solid #334155; 
        }
        a { color: #60a5fa; }
        a:hover { color: #93c5fd; }
      `,
      color_map: colorMap,
      quickbars_selection_toolbar: 'bold italic underline | forecolor backcolor | link unlink',
      quickbars_insert_toolbar: 'quicktable image anchor charmap codesample',
      image_caption: true,
      image_advtab: true,
      image_title: true,
      image_dimensions: false,
      default_link_target: '_blank',
      link_default_target: '_blank',
      link_title: false,
      table_toolbar:
        'tableprops cellprops | tableinsertrowbefore tableinsertrowafter | tabledeleterow | tableinsertcolbefore tableinsertcolafter | tabledeletecol | tablemergecells tablesplitcells',
      table_default_styles: {
        borderCollapse: 'collapse',
        width: '100%',
      },
      table_default_attributes: {
        border: '0',
      },
      paste_data_images: false,
      paste_tab_spaces: 2,
      paste_word_valid_elements:
        'b,strong,i,em,u,strike,p,div,span,ul,ol,li,table,tbody,thead,tr,td,th,h1,h2,h3,h4,h5,h6,blockquote,code',
      insertdatetime_formats: ['%d/%m/%Y', '%d/%m/%Y %H:%M'],
      insertdatetime_element: true,
      browser_spellcheck: true,
      contextmenu: 'link table',
      advlist_bullet_styles: 'default,circle,square',
      advlist_number_styles: 'default,lower-alpha,lower-roman,upper-alpha,upper-roman',
      codesample_global_prismjs: true,
      codesample_languages: [
        { text: 'HTML', value: 'markup' },
        { text: 'JavaScript', value: 'javascript' },
        { text: 'TypeScript', value: 'typescript' },
        { text: 'CSS', value: 'css' },
        { text: 'Python', value: 'python' },
        { text: 'Shell', value: 'bash' },
      ],
      toolbar_mode: 'sliding',
      // Melhor integração com o tema escuro
      promotion: false,
      body_class: 'dark-editor',
      // Remove bordas e ajusta cores
      setup: (editor: TinyMCEEditor) => {
        let spellcheckEnabled = true;

        const applyChecklistClasses = () => {
          editor.dom.select('ul.task-list li').forEach((node: Element) => {
            editor.dom.addClass(node as HTMLElement, 'task-list-item');
          });
        };

        editor.on('init', () => {
          const body = editor.getBody();
          if (body) {
            body.setAttribute('spellcheck', spellcheckEnabled ? 'true' : 'false');
            // Remove bordas brancas adicionais
            body.style.border = 'none';
            body.style.outline = 'none';
          }
          
          // Remove bordas do container do editor
          const container = editor.getContainer();
          if (container) {
            const editArea = container.querySelector('.tox-edit-area') as HTMLElement;
            const iframe = container.querySelector('.tox-edit-area iframe') as HTMLElement;
            if (editArea) {
              editArea.style.border = 'none';
              editArea.style.backgroundColor = '#1e293b';
            }
            if (iframe) {
              iframe.style.border = 'none';
            }
          }
          
          applyChecklistClasses();
        });

        editor.on('SetContent', applyChecklistClasses);
        editor.on('NodeChange', applyChecklistClasses);

        editor.ui.registry.addToggleButton('outlookChecklist', {
          text: 'Checklist',
          tooltip: 'Transformar em lista de tarefas',
          onAction: (api) => {
            editor.execCommand('InsertUnorderedList');
            const list = editor.dom.getParent(editor.selection.getNode(), 'ul');
            if (!list) {
              api.setActive(false);
              return;
            }
            const listElement = list as HTMLElement;
            const hasClass = editor.dom.hasClass(listElement, 'task-list');
            if (hasClass) {
              editor.dom.removeClass(listElement, 'task-list');
              editor.dom.setStyle(listElement, 'list-style-type', '');
              editor.dom.select('li', listElement).forEach((node: Element) => {
                editor.dom.removeClass(node as HTMLElement, 'task-list-item');
              });
              api.setActive(false);
            } else {
              editor.dom.addClass(listElement, 'task-list');
              editor.dom.setStyle(listElement, 'list-style-type', 'none');
              editor.dom.select('li', listElement).forEach((node: Element) => {
                editor.dom.addClass(node as HTMLElement, 'task-list-item');
              });
              api.setActive(true);
            }
            editor.fire('Change');
          },
          onSetup: (api) => {
            const handler = () => {
              const list = editor.dom.getParent(editor.selection.getNode(), 'ul');
              const active = !!list && editor.dom.hasClass(list as HTMLElement, 'task-list');
              api.setActive(active);
            };
            editor.on('NodeChange', handler);
            return () => {
              editor.off('NodeChange', handler);
            };
          },
        });

        editor.ui.registry.addButton('outlookPastePlain', {
          text: 'Colar texto',
          tooltip: 'Colar sem formatacao',
          onAction: async () => {
            const notifyFallback = () => {
              editor.notificationManager.open({
                text: 'Use Ctrl+Shift+V para colar sem formatacao.',
                type: 'info',
              });
            };

            if (navigator?.clipboard?.readText) {
              try {
                const plain = await navigator.clipboard.readText();
                if (!plain) {
                  notifyFallback();
                  return;
                }
                const encoded = editor.dom.encode(plain).replace(/\r?\n/g, '<br />');
                editor.insertContent(encoded);
                return;
              } catch {
                notifyFallback();
                return;
              }
            }

            notifyFallback();
          },
        });

        editor.ui.registry.addButton('outlookHr', {
          text: 'Linha',
          tooltip: 'Inserir linha horizontal',
          onAction: () => {
            editor.execCommand('InsertHorizontalRule');
          },
        });

        editor.ui.registry.addButton('outlookExportWord', {
          text: 'Word',
          tooltip: 'Exportar conteudo como Word (.doc)',
          onAction: () => {
            const html = editor.getContent({ format: 'html' });
            const documentHtml = `<html><head><meta charset="utf-8" /></head><body>${html}</body></html>`;
            const blob = new Blob([documentHtml], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `email-${new Date().toISOString().slice(0, 10)}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          },
        });

        editor.ui.registry.addButton('outlookExportPdf', {
          text: 'PDF',
          tooltip: 'Abrir visualizacao para impressao / PDF',
          onAction: () => {
            const html = editor.getContent({ format: 'html' });
            const printWindow = window.open('', '_blank', 'noopener');
            if (!printWindow) {
              return;
            }
            printWindow.document.write(`<html><head><meta charset="utf-8" /><title>Email</title></head><body>${html}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              printWindow.print();
            }, 100);
          },
        });

        editor.ui.registry.addToggleButton('outlookSpellcheck', {
          text: 'ABC',
          tooltip: 'Ativar/desativar verificacao ortografica do navegador',
          onAction: (api) => {
            spellcheckEnabled = !spellcheckEnabled;
            const body = editor.getBody();
            if (body) {
              body.setAttribute('spellcheck', spellcheckEnabled ? 'true' : 'false');
            }
            api.setActive(spellcheckEnabled);
          },
          onSetup: (api) => {
            api.setActive(spellcheckEnabled);
            return () => {
              // noop
            };
          },
        });
      },
    } as Record<string, unknown>;
  }, []);

  useEffect(() => {
    void loadEmpresas()
    void loadEmailConfig()
  }, [])

  async function loadEmpresas() {
    try {
      setLoading(true)
      const data = await api.listarEmpresasEmails()
      setEmpresas(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao buscar empresas'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function loadEmailConfig() {
    try {
      const cfg = await api.obterEmailConfig()
      setEmailConfig(cfg)
      setSenderEmail((current) => current || cfg.defaultSender)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar remetentes'
      toast.error(message)
    }
  }

  const filteredEmpresas = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return empresas
    return empresas.filter((empresa) => {
      const tokens = [empresa.nome, empresa.id_empresa].join(' ').toLowerCase()
      return tokens.includes(term)
    })
  }, [empresas, search])

  const selectedEmpresas = useMemo(
    () => empresas.filter((empresa) => selectedIds.has(empresa.empresa_id)),
    [empresas, selectedIds],
  )

  const { autoRecipients, missing } = useMemo(() => {
    const emails: string[] = []
    const missingCompanies: EmpresaEmail[] = []
    const seen = new Set<string>()

    for (const empresa of selectedEmpresas) {
      if (!empresa.emails.length) {
        missingCompanies.push(empresa)
        continue
      }
      for (const email of empresa.emails) {
        const key = normalizeEmail(email)
        if (seen.has(key)) continue
        seen.add(key)
        emails.push(email)
      }
    }

    return { autoRecipients: emails, missing: missingCompanies }
  }, [selectedEmpresas])

  const manualLookup = useMemo(() => {
    return new Set(manualRecipients.map((email) => normalizeEmail(email)))
  }, [manualRecipients])

  const finalRecipients = useMemo(() => {
    const result: string[] = []
    const blocked = new Set(removedRecipients)
    const seen = new Set<string>()

    for (const email of autoRecipients) {
      const key = normalizeEmail(email)
      if (blocked.has(key) || seen.has(key)) continue
      seen.add(key)
      result.push(email)
    }

    for (const email of manualRecipients) {
      const trimmed = email.trim()
      if (!trimmed) continue
      const key = normalizeEmail(trimmed)
      if (seen.has(key)) continue
      seen.add(key)
      result.push(trimmed)
    }

    return result
  }, [autoRecipients, manualRecipients, removedRecipients])

  const autoLookup = useMemo(() => {
    return new Set(autoRecipients.map((email) => normalizeEmail(email)))
  }, [autoRecipients])

  const hasOverrides = manualRecipients.length > 0 || removedRecipients.length > 0

  useEffect(() => {
    if (!removedRecipients.length) return
    const available = new Set(autoRecipients.map((email) => normalizeEmail(email)))
    setRemovedRecipients((prev) => {
      const filtered = prev.filter((email) => available.has(email))
      return filtered.length === prev.length ? prev : filtered
    })
  }, [autoRecipients])

  const hasBody = useMemo(() => {
    const textContent = bodyHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return textContent.length > 0
  }, [bodyHtml])

  const canSend = finalRecipients.length > 0 && subject.trim().length > 0 && hasBody && Boolean(senderEmail || emailConfig?.defaultSender)

  const toolbarButtonLabel = loading ? 'Atualizando...' : 'Recarregar'

  const handleToggleEmpresa = (empresaId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(empresaId)) {
        next.delete(empresaId)
      } else {
        next.add(empresaId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allIds = filteredEmpresas.map((empresa) => empresa.empresa_id)
      const allSelected = allIds.every((id) => next.has(id))
      if (allSelected) {
        allIds.forEach((id) => next.delete(id))
      } else {
        allIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleRemoveRecipient = (email: string) => {
    const key = normalizeEmail(email)
    if (manualLookup.has(key)) {
      setManualRecipients((prev) => prev.filter((item) => normalizeEmail(item) !== key))
      return
    }
    if (autoLookup.has(key)) {
      setRemovedRecipients((prev) => (prev.includes(key) ? prev : [...prev, key]))
    }
  }

  const handleAddManualRecipient = () => {
    const email = manualEmailInput.trim()
    if (!email) {
      toast.error('Informe um e-mail para adicionar')
      return
    }
    if (!emailPattern.test(email)) {
      toast.error('E-mail invalido')
      return
    }
    const key = normalizeEmail(email)
    const alreadyIncluded = finalRecipients.some((item) => normalizeEmail(item) === key)
    if (alreadyIncluded) {
      toast.warning('E-mail ja incluso na lista')
      setManualEmailInput('')
      return
    }
    setManualRecipients((prev) => [...prev, email])
    setRemovedRecipients((prev) => prev.filter((item) => item !== key))
    setManualEmailInput('')
  }

  const handleManualInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddManualRecipient()
    }
  }

  const handleSend = async () => {
    if (!canSend) {
      toast.error('Preencha assunto, corpo e escolha ao menos um destinatario')
      return
    }

    const chosenSender = (senderEmail || emailConfig?.defaultSender || '').trim()
    if (!chosenSender) {
      toast.error('Defina um remetente valido')
      return
    }

    const payload: EmailSendRequest = {
      empresaIds: Array.from(selectedIds),
      subject: subject.trim(),
      bodyHtml,
      saveToSentItems: true,
      senderEmail: chosenSender,
    }

    if (hasOverrides) {
      payload.overrideRecipients = finalRecipients
    }

    try {
      setSending(true)
      const response = await api.enviarEmails(payload)
      const delivered = response.recipients.length
      const failed = response.failedRecipients?.length ?? 0

      if (delivered) {
        toast.success(`E-mail enviado (${delivered} destinatario(s)) como ${response.sender}`)
      } else {
        toast.warning('Nenhum e-mail foi enviado. Corrija os enderecos indicados e tente novamente')
      }

      if (failed) {
        const preview = response.failedRecipients.slice(0, 5).join(', ')
        const suffix = failed > 5 ? ` ... (+${failed - 5})` : ''
        toast.error(`Nao foi possivel enviar para ${failed} destinatario(s): ${preview}${suffix}`)
      }

      if (response.missing.length) {
        toast.warning('Algumas empresas nao possuem e-mail configurado na planilha')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar e-mail'
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 text-white">
      <div className="p-6">
        <Card className="bg-slate-900/70 border border-blue-800/40 backdrop-blur-sm shadow-lg shadow-blue-900/20">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-blue-100">
              <Mail className="h-5 w-5 text-blue-400" />
              Compositor de E-mails
            </CardTitle>
            <CardDescription className="text-blue-200">
              Selecione empresas, edite o assunto e o corpo no TinyMCE e envie via Microsoft Graph.
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="w-full lg:w-1/2">
              <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-blue-800/40 bg-slate-900/60 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-blue-200">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium uppercase tracking-wide text-blue-300">Empresas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs uppercase tracking-wide text-blue-200 hover:text-blue-100 hover:bg-blue-800/20"
                  >
                    {filteredEmpresas.every((empresa) => selectedIds.has(empresa.empresa_id))
                      ? 'Limpar filtro'
                      : 'Selecionar filtro'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadEmpresas()}
                    disabled={loading}
                    className="gap-1 text-xs uppercase tracking-wide text-blue-200 hover:text-blue-100 hover:bg-blue-800/20"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                    {toolbarButtonLabel}
                  </Button>
                </div>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nome ou ID"
                    className="pl-9 text-sm bg-white/10 border-blue-500/30 text-white placeholder:text-blue-300"
                  />
                </div>
                <Badge variant="outline" className="border-blue-600/50 bg-blue-800/25 text-blue-200">
                  {selectedEmpresas.length} selecionadas
                </Badge>
              </div>

              <ScrollArea className="h-72 rounded-lg border border-blue-800/40 bg-slate-900/60 backdrop-blur-sm">
                <div className="divide-y divide-blue-800/30">
                  {loading && (
                    <div className="flex items-center justify-center gap-2 p-4 text-blue-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando empresas...
                    </div>
                  )}
                  {!loading && filteredEmpresas.length === 0 && (
                    <div className="p-4 text-sm text-blue-300">
                      Nenhuma empresa encontrada para o filtro atual.
                    </div>
                  )}
                  {filteredEmpresas.map((empresa) => {
                    const selected = selectedIds.has(empresa.empresa_id);
                    const hasEmails = empresa.emails.length > 0;

                    return (
                      <label
                        key={empresa.empresa_id}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 p-3 transition-colors',
                          selected ? 'bg-blue-800/25' : 'hover:bg-blue-800/15',
                          !hasEmails && 'opacity-80'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleToggleEmpresa(empresa.empresa_id)}
                          className="mt-1 h-4 w-4 accent-blue-500"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-blue-100">
                            <span className="font-medium">{empresa.nome}</span>
                            <Badge variant="outline" className="border-blue-600/50 bg-blue-800/30 text-[11px] uppercase tracking-wide text-blue-200">
                              {empresa.id_empresa}
                            </Badge>
                          </div>
                          <div className="text-xs text-blue-300">
                            {hasEmails ? empresa.emails.join(', ') : 'Sem e-mail cadastrado na planilha (coluna H)'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="w-full space-y-4 lg:w-1/2">
              <div>
                <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-blue-300">
                  Remetente
                </label>
                <select
                  value={senderEmail}
                  onChange={(event) => setSenderEmail(event.target.value)}
                  disabled={!emailConfig}
                  title="Selecione o remetente"
                  className="mt-1 w-full rounded-md border border-blue-500/30 bg-white/10 px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {emailConfig?.allowedSenders.map((email) => (
                    <option key={email} value={email} className="bg-slate-800 text-white">
                      {email}
                    </option>
                  ))}
                </select>
                {!emailConfig && (
                  <p className="mt-1 text-xs text-blue-400">Carregando remetentes...</p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-blue-300">
                  Assunto
                </label>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Digite o assunto do e-mail"
                  className="mt-1 bg-white/10 border-blue-500/30 text-white placeholder:text-blue-300"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-blue-300">
                  <span>Corpo</span>
                  <span className="text-[10px] text-blue-400">Editor TinyMCE com suporte a colagem do Word</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-blue-500/30 bg-slate-800">
                  <Editor
                    licenseKey="gpl"
                    value={bodyHtml}
                    onEditorChange={(value) => setBodyHtml(value)}
                    init={editorInit}
                  />
                </div>
              </div>

              <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-100">
                <AlertTitle className="text-amber-100">Destinatarios</AlertTitle>
                <AlertDescription className="text-amber-50">
                  {finalRecipients.length} destinatario(s) unicos serao incluidos. Empresas sem e-mail continuam listadas para ajuste na Planilha Mestre.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-blue-300">
            <Badge variant="outline" className="border-blue-600/50 bg-blue-800/25 text-blue-200">
              {finalRecipients.length} destinatarios
            </Badge>
            {missing.length > 0 && (
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-100">
                {missing.length} empresa(s) sem e-mail
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-600/50 bg-blue-800/25 text-blue-100 hover:bg-blue-700/30 hover:text-white">
                  Visualizar destinatarios
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 text-blue-100 border border-blue-800/40">
                <DialogHeader>
                  <DialogTitle className="text-blue-100">Destinatarios preparados</DialogTitle>
                  <DialogDescription className="text-blue-200">
                    Empresas selecionadas e e-mails encontrados na Planilha Mestre.xlsx.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-200">E-mails ({finalRecipients.length})</h4>
                    <ScrollArea className="mt-2 h-40 rounded border border-blue-800/40 bg-slate-900/60">
                      <ul className="space-y-2 p-3 text-sm text-blue-100">
                        {finalRecipients.length === 0 && (
                          <li className="text-xs text-blue-300">Nenhum destinatario disponivel.</li>
                        )}
                        {finalRecipients.map((email) => {
                          const normalized = normalizeEmail(email)
                          const isManual = manualLookup.has(normalized)
                          return (
                            <li
                              key={email}
                              className="flex items-center justify-between gap-3 rounded border border-blue-800/40 bg-slate-900/70 px-3 py-2"
                            >
                              <div className="flex flex-col">
                                <span className="font-mono text-xs">{email}</span>
                                {isManual && (
                                  <span className="text-[10px] uppercase tracking-wide text-blue-400">Manual</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRecipient(email)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-blue-800/40 text-blue-300 hover:bg-blue-800/30 hover:text-white"
                                title="Remover destinatario"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </ScrollArea>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={manualEmailInput}
                        onChange={(event) => setManualEmailInput(event.target.value)}
                        onKeyDown={handleManualInputKeyDown}
                        placeholder="Adicionar e-mail manual"
                        className="flex-1 bg-white/10 border-blue-500/30 text-white placeholder:text-blue-300"
                      />
                      <Button
                        type="button"
                        onClick={handleAddManualRecipient}
                        className="gap-2 bg-blue-600/90 hover:bg-blue-500"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-200">Empresas selecionadas</h4>
                    <ScrollArea className="mt-2 h-32 rounded border border-blue-800/40 bg-slate-900/60">
                      <ul className="space-y-1 p-3 text-sm text-blue-100">
                        {selectedEmpresas.map((empresa) => (
                          <li key={`empresa-${empresa.empresa_id}`}>
                            <span className="font-medium">{empresa.nome}</span>
                            <span className="ml-2 text-xs text-blue-400">ID {empresa.id_empresa}</span>
                            {empresa.emails.length === 0 && (
                              <span className="ml-2 text-xs text-amber-300">Sem e-mail</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                  {missing.length > 0 && (
                    <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-50">
                      <AlertTitle>Empresas sem e-mail</AlertTitle>
                      <AlertDescription>
                        Atualize a coluna H da planilha para liberar o envio.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={() => void handleSend()} disabled={!canSend || sending} className="bg-blue-600 hover:bg-blue-500">
                    {sending ? 'Enviando...' : 'Enviar agora'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              onClick={() => void handleSend()}
              disabled={!canSend || sending}
              className="gap-2 bg-blue-600 hover:bg-blue-500"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar e-mail
            </Button>
          </div>
        </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default EmailCompose

























