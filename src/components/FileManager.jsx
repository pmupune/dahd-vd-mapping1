import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileJson, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

const FileInput = ({ label, accept, onFileLoaded, icon: Icon, required }) => {
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [fileName, setFileName] = useState('');

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setStatus('loading');
        setFileName(file.name);

        try {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const content = evt.target.result;
                    let data;
                    const lowerName = file.name.toLowerCase();

                    if (lowerName.endsWith('.json') || lowerName.endsWith('.geojson')) {
                        data = JSON.parse(content);
                    } else if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
                        const workbook = XLSX.read(content, { type: 'binary' });
                        const sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[sheetName];
                        data = XLSX.utils.sheet_to_json(sheet);
                    } else {
                        throw new Error("Unsupported file format");
                    }

                    if (!data) throw new Error("No data parsed");

                    console.log(`Loaded ${label}:`, data); // Debug log
                    onFileLoaded(data);
                    setStatus('success');
                } catch (err) {
                    console.error("Parse Error", err);
                    setStatus('error');
                    alert(`Failed to parse file: ${err.message}`);
                }
            };

            if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                reader.readAsBinaryString(file);
            } else {
                reader.readAsText(file);
            }

        } catch (error) {
            console.error("File Read Error", error);
            setStatus('error');
        }
    };

    return (
        <div className="flex flex-col gap-2 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
            <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-2">
                    {Icon && <Icon size={16} />}
                    {label}
                </span>
                {status === 'success' && <CheckCircle className="text-green-500" size={16} />}
                {status === 'error' && <AlertCircle className="text-red-500" size={16} />}
            </label>
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-brand-50 file:text-brand-700
              hover:file:bg-brand-100
            "
                />
            </div>
            {fileName && <p className="text-xs text-slate-400 truncate">{fileName}</p>}
        </div>
    );
};

export default function FileManager({ onDataLoaded }) {
    // onDataLoaded: ({ type: 'district' | 'taluka' | 'village' | 'population', data: any }) => void

    return (
        <div className="flex flex-col gap-4 w-full p-4 bg-slate-50 border-r border-slate-200 h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Data Management</h2>
            <p className="text-sm text-slate-500 mb-6">Upload your Shapefiles (GeoJSON) and Population Data to visualize.</p>

            <FileInput
                label="District GeoJSON"
                accept=".json, .geojson"
                icon={FileJson}
                onFileLoaded={(data) => onDataLoaded('district', data)}
            />
            <FileInput
                label="Taluka GeoJSON"
                accept=".json, .geojson"
                icon={FileJson}
                onFileLoaded={(data) => onDataLoaded('taluka', data)}
            />
            <FileInput
                label="Village GeoJSON"
                accept=".json, .geojson"
                icon={FileJson}
                onFileLoaded={(data) => onDataLoaded('village', data)}
            />

            <div className="my-2 border-t border-slate-200"></div>

            <FileInput
                label="Population Data (CSV/Excel)"
                accept=".csv, .xlsx, .xls"
                icon={FileSpreadsheet}
                onFileLoaded={(data) => onDataLoaded('population', data)}
            />

        </div>
    );
}
