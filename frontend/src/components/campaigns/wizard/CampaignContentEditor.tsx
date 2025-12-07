import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CampaignWizardData, PERSONALIZATION_VARIABLES } from '../types'
import { Monitor, Smartphone, Mail } from 'lucide-react'

interface CampaignContentEditorProps {
  data: CampaignWizardData
  onChange: (updates: Partial<CampaignWizardData>) => void
  errors?: Record<string, string>
}

type EditorMode = 'visual' | 'html' | 'text'
type PreviewMode = 'desktop' | 'mobile'

export function CampaignContentEditor({ data, onChange, errors }: CampaignContentEditorProps) {
  const [editorMode, setEditorMode] = useState<EditorMode>('html')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop')
  const [showVariables, setShowVariables] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertVariable = (varName: string) => {
    const placeholder = `{{${varName}}}`
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const text = data.content.htmlContent
      const newText = text.substring(0, start) + placeholder + text.substring(end)
      onChange({ content: { ...data.content, htmlContent: newText } })
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(start + placeholder.length, start + placeholder.length)
        }
      }, 0)
    } else {
      onChange({ content: { ...data.content, htmlContent: data.content.htmlContent + placeholder } })
    }
    setShowVariables(false)
  }

  const getPreviewHtml = () => {
    let html = data.content.htmlContent
    PERSONALIZATION_VARIABLES.forEach(v => {
      html = html.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), v.example)
    })
    return html
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Email Content</h2>
        <p className="text-neutral-500">Design your email content with our editor</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
              {(['html', 'text'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setEditorMode(mode)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    editorMode === mode
                      ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {mode === 'html' ? 'HTML' : 'Plain Text'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowVariables(!showVariables)}>
                {'{{x}}'} Insert Variable
              </Button>
              {showVariables && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10">
                  <div className="p-2 border-b border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs font-medium text-neutral-500">Personalization Variables</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {PERSONALIZATION_VARIABLES.map(v => (
                      <button
                        key={v.name}
                        onClick={() => insertVariable(v.name)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md flex justify-between items-center"
                      >
                        <span>{v.label}</span>
                        <code className="text-xs bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                          {`{{${v.name}}}`}
                        </code>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Card className={errors?.content ? 'border-red-500' : ''}>
            <CardContent className="p-0">
              {editorMode === 'html' ? (
                <textarea
                  ref={textareaRef}
                  value={data.content.htmlContent}
                  onChange={e => onChange({ content: { ...data.content, htmlContent: e.target.value } })}
                  className="w-full h-[450px] p-4 font-mono text-sm bg-transparent border-0 focus:ring-0 focus:outline-none resize-none"
                  placeholder="<div>Enter your HTML content here...</div>"
                />
              ) : (
                <textarea
                  value={data.content.textContent || ''}
                  onChange={e => onChange({ content: { ...data.content, textContent: e.target.value } })}
                  className="w-full h-[450px] p-4 text-sm bg-transparent border-0 focus:ring-0 focus:outline-none resize-none"
                  placeholder="Enter plain text version of your email for clients that don't support HTML..."
                />
              )}
            </CardContent>
          </Card>
          {errors?.content && <p className="text-sm text-red-500">{errors.content}</p>}
          {editorMode === 'text' && (
            <p className="text-xs text-neutral-500">
              Plain text fallback is shown to recipients whose email clients don't support HTML
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Preview</Label>
            <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
              {(['desktop', 'mobile'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    previewMode === mode
                      ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {mode === 'desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                  <span className="capitalize">{mode}</span>
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                </div>
                <span className="text-xs text-neutral-500 ml-2">Preview</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-neutral-50 dark:bg-neutral-900">
              <div
                className={`bg-white dark:bg-neutral-800 mx-auto transition-all duration-300 rounded-lg shadow-inner overflow-hidden ${
                  previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
                }`}
                style={{ minHeight: '400px' }}
              >
                {data.content.htmlContent ? (
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style></head><body>${getPreviewHtml()}</body></html>`}
                    className="w-full h-[400px] border-0"
                    title="Email Preview"
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-neutral-400">
                    <div className="text-center">
                      <Mail className="h-10 w-10 mx-auto mb-2" />
                      <p>Your email preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

