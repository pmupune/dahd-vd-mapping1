import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Save, Download, Edit2, AlertCircle } from 'lucide-react';

export default function VDAnalysisPanel({
    currentTaluka,
    populationData,
    onUpdateVillageVD, // (villageCode, newVDName, newVDType) => void
    onHoverVD, // [NEW] (vdName) => void
    onExport // Function to trigger parent export or handle it here
}) {
    const [editingVillage, setEditingVillage] = useState(null); // villageCode
    const [openVD, setOpenVD] = useState(null); // vdName

    const [detectedKey, setDetectedKey] = useState(null);

    // 1. Group Data by VD
    const vdGroups = useMemo(() => {
        if (!populationData || !currentTaluka) return {};

        const groups = {};
        let activeKey = null;

        // Filter for current Taluka first
        const talukaData = populationData.filter(row => {
            const tName = row['Tehsil Name'] || row.THNAME || row.Taluka || row.TALUKA || row.Tehsil;
            return tName && String(tName).trim().toLowerCase() === String(currentTaluka).trim().toLowerCase();
        });



        talukaData.forEach(row => {
            // Determine VD Name (Priority: Restructuring -> Old -> Unknown)
            let vdName = row['VD name_Restructuring'] || row['VD Name_Restructuring'] || row['VD Name'];

            // Fallback to Old if Restructuring is empty/null, but usually we want to group by the "Current State"
            if (!vdName) vdName = row['VD type_Old'] || "Unassigned";

            if (!groups[vdName]) {
                groups[vdName] = {
                    name: vdName,
                    type: row['VD type_Old'] || 'Unknown', // Keep track of type
                    popSum: 0,
                    villages: []
                };
            }

            // Sum Population: Robust detection
            let pop = 0;
            // potential keys in priority order
            const priorityKeys = [
                'Bovine Unit_21st LC',
                'Total HH Animals_21st LC',
                'Total HH Animals',
                'Population',
                'Total Population',
                'Total_Population',
                'Census_2011_Population',
                'Pop'
            ];
            let foundKey = priorityKeys.find(k => row[k] != null && row[k] !== '');


            if (!foundKey) {
                // Fuzzy search
                foundKey = Object.keys(row).find(k => k.toLowerCase() === 'population' || k.toLowerCase().includes('total population'));
            }
            if (!foundKey) {
                // Fallback to any 'pop'
                foundKey = Object.keys(row).find(k => k.toLowerCase().includes('population') || k.toLowerCase().includes('pop'));
            }

            if (foundKey) {
                if (!activeKey) activeKey = foundKey;
                const raw = String(row[foundKey]).replace(/,/g, '');
                pop = parseFloat(raw) || 0;
            }

            groups[vdName].popSum += pop;
            groups[vdName].villages.push({
                ...row,
                _pop: pop
            });
        });

        setDetectedKey(activeKey || 'N/A');
        return groups;
    }, [populationData, currentTaluka]);

    const sortedVDs = useMemo(() => {
        return Object.values(vdGroups).sort((a, b) => b.popSum - a.popSum);
    }, [vdGroups]);

    const handleExport = () => {
        // Create a worksheet from the current (potentially modified) populationData
        const ws = XLSX.utils.json_to_sheet(populationData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Scenario_Data");
        XLSX.writeFile(wb, `VD_Scenario_${currentTaluka}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl w-[400px]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                    <h2 className="font-bold text-slate-800">VD Analysis</h2>
                    <p className="text-xs text-slate-500">Taluka: {currentTaluka}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Metric: {detectedKey}</p>
                </div>
                <button
                    onClick={handleExport}
                    className="p-2 bg-brand-600 text-white rounded shadow hover:bg-brand-700 flex items-center gap-1 text-xs font-semibold"
                >
                    <Save size={14} /> Save Scenario
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 bg-slate-100/50">
                <div className="flex flex-col gap-3">
                    {sortedVDs.map(vd => (
                        <div key={vd.name} className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                            {/* Card Header (Stats) */}
                            <div
                                className="p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setOpenVD(openVD === vd.name ? null : vd.name)}
                                onMouseEnter={() => onHoverVD && onHoverVD(vd.name)}
                                onMouseLeave={() => onHoverVD && onHoverVD(null)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-slate-700 text-sm">{vd.name}</h3>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${vd.type === 'Unassigned' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        {vd.type}
                                    </span>
                                </div>
                                <div className="flex gap-3 text-xs text-slate-500">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-semibold text-slate-400">Villages</span>
                                        <span className="font-mono text-slate-700 font-medium">{vd.villages.length}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-semibold text-slate-400">Population</span>
                                        <span className="font-mono text-brand-600 font-bold">{Math.round(vd.popSum).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Village List */}
                            {openVD === vd.name && (
                                <div className="border-t border-slate-100 bg-slate-50 p-2 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                                    {vd.villages.map(v => (
                                        <div key={v['Village Code'] || v['Village Name']} className="flex items-center justify-between text-xs p-2 bg-white border border-slate-200 rounded group hover:border-brand-300">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-medium text-slate-700 truncate">{v['Village Name'] || v.VLNAME || 'Unknown'}</span>
                                                <span className="text-[10px] text-slate-400">Pop: {v._pop.toLocaleString()}</span>
                                            </div>

                                            {/* Edit Action */}
                                            <div className="relative">
                                                <select
                                                    className="max-w-[100px] text-[10px] p-1 border border-slate-200 rounded bg-white focus:ring-1 focus:ring-brand-500"
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            onUpdateVillageVD(v, e.target.value);
                                                            // e.target.value = ""; // Reset
                                                        }
                                                    }}
                                                >
                                                    <option value="" disabled>Move to...</option>
                                                    {Object.keys(vdGroups).filter(n => n !== vd.name).sort().map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                    <option value="Unassigned">Unassigned</option>
                                                    <option value="New VD...">+ New VD</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {sortedVDs.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No VDs found in this Taluka. <br />Check your data column names.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
