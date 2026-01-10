import React, { useState } from 'react'
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react'
import { 
  ResolutionStatus, 
  ResolutionPriority,
  ResolutionListOptions,
  ResolutionStatusLabels,
  ResolutionPriorityLabels
} from '@/types/resolution.types'
import ResolutionService from '@/services/resolutionService'

interface ResolutionExportProps {
  eventId: string
  currentFilters?: ResolutionListOptions
  onExportStart?: () => void
  onExportComplete?: () => void
  onExportError?: (error: string) => void
}

export const ResolutionExport: React.FC<ResolutionExportProps> = ({
  eventId,
  currentFilters = {},
  onExportStart,
  onExportComplete,
  onExportError
}) => {
  const [showModal, setShowModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv')
  const [exportFilters, setExportFilters] = useState<ResolutionListOptions>(currentFilters)
  const [exporting, setExporting] = useState(false)

  const formatOptions = [
    {
      value: 'csv' as const,
      label: 'CSV',
      description: 'Fichier CSV compatible avec Excel et autres tableurs',
      icon: <FileText className="w-5 h-5" />
    },
    {
      value: 'excel' as const,
      label: 'Excel',
      description: 'Fichier Excel (.xlsx) avec formatage avancé',
      icon: <FileSpreadsheet className="w-5 h-5" />
    },
    {
      value: 'pdf' as const,
      label: 'PDF',
      description: 'Document PDF pour impression et partage',
      icon: <File className="w-5 h-5" />
    }
  ]

  const handleExport = async () => {
    if (!eventId) return

    setExporting(true)
    onExportStart?.()

    try {
      await ResolutionService.exportResolutions(eventId, exportFormat, exportFilters)
      onExportComplete?.()
      setShowModal(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'export'
      onExportError?.(errorMessage)
    } finally {
      setExporting(false)
    }
  }

  const handleFilterChange = (key: keyof ResolutionListOptions, value: any) => {
    setExportFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }

  return (
    <>
      {/* Bouton d'export */}
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Download className="w-4 h-4 mr-2" />
        Exporter
      </button>

      {/* Modal d'export */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            />

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Download className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Exporter les résolutions
                    </h3>

                    {/* Format d'export */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Format d'export
                      </label>
                      <div className="space-y-3">
                        {formatOptions.map((format) => (
                          <label key={format.value} className="flex items-start">
                            <input
                              type="radio"
                              name="exportFormat"
                              value={format.value}
                              checked={exportFormat === format.value}
                              onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <div className="flex items-center">
                                {format.icon}
                                <span className="ml-2 text-sm font-medium text-gray-900">
                                  {format.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {format.description}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Filtres d'export */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Filtres d'export
                      </label>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Statut</label>
                          <select
                            value={exportFilters.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value as ResolutionStatus)}
                            className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                          >
                            <option value="">Tous les statuts</option>
                            {Object.entries(ResolutionStatusLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Priorité</label>
                          <select
                            value={exportFilters.priority || ''}
                            onChange={(e) => handleFilterChange('priority', e.target.value as ResolutionPriority)}
                            className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
                          >
                            <option value="">Toutes les priorités</option>
                            {Object.entries(ResolutionPriorityLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="flex items-center text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={exportFilters.overdue || false}
                              onChange={(e) => handleFilterChange('overdue', e.target.checked)}
                              className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            En retard uniquement
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Aperçu des données */}
                    <div className="bg-gray-50 rounded-md p-3 mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Données incluses dans l'export :
                      </h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Titre et description</li>
                        <li>• Statut et priorité</li>
                        <li>• Assignés et créateur</li>
                        <li>• Dates (création, échéance, mise à jour)</li>
                        <li>• Progrès et heures</li>
                        <li>• Tags et commentaires</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Export en cours...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Exporter
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={exporting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ResolutionExport