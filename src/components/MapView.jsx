import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertCircle } from 'lucide-react';
import { getPaletteColor } from '../utils/palette';

// Fix for default Leaflet icon issues
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;


// Internal component to handle map effects
function MapController({ geoData }) {
    const map = useMap();

    useEffect(() => {
        if (geoData && geoData.features && geoData.features.length > 0) {
            const group = L.geoJSON(geoData);
            const bounds = group.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds);
            }
        }
    }, [geoData, map]);

    return null;
}

// ... existing code ...
export default function MapView({
    geoData,
    level,
    onFeatureClick,
    populationData,
    selectedFeature,

    vdMode, // [NEW] boolean
    context, // [NEW] { districtName, talukaName }
    hoveredVD // [NEW] string | null
}) {
    const [showTiles, setShowTiles] = useState(true);
    const [showHoverTooltip, setShowHoverTooltip] = useState(true); // [NEW] Default true
    const [colorBy, setColorBy] = useState('');
    const [filterAttribute, setFilterAttribute] = useState('');
    const [filterValue, setFilterValue] = useState('All');
    const [urbanFilter, setUrbanFilter] = useState('All');
    const [urbanTehsilFilter, setUrbanTehsilFilter] = useState('All');
    const [showUrbanFilters, setShowUrbanFilters] = useState(false);
    const [stats, setStats] = useState({ min: 0, max: 0 });
    const [hoveredData, setHoveredData] = useState(null);
    const [pinnedData, setPinnedData] = useState(null);

    const [visibleKeys, setVisibleKeys] = useState({});
    const [isTooltipConfigOpen, setIsTooltipConfigOpen] = useState(false);
    const [showDetailedTooltip, setShowDetailedTooltip] = useState(false);


    // ... existing useMemo for keys ...
    const { numericKeys, categoricalKeys, allKeys } = useMemo(() => {
        // ... same existing logic ...
        if (!populationData || !populationData.length) return { numericKeys: [], categoricalKeys: [], allKeys: [] };
        const sample = populationData[0];
        if (!sample) return { numericKeys: [], categoricalKeys: [], allKeys: [] };

        const nums = [];
        const cats = [];
        const all = Object.keys(sample).filter(k =>
            !['id', 'userId', 'DTNAME', 'THNAME', 'VLNAME', 'Name', 'District', 'Taluka', 'Village'].includes(k)
        );

        Object.keys(sample).forEach(key => {
            if (key.toLowerCase().includes('id') || key === 'userId') return;
            const rawVal = String(sample[key]);
            const val = parseFloat(rawVal.replace(/,/g, ''));
            const lowerKey = key.toLowerCase();
            const isCode = lowerKey.includes('code') || lowerKey.endsWith(' id');

            // [NEW] Exclude 'Code' from numeric keys to prevent summing/average
            if (!isNaN(val) && isFinite(val) && !isCode) {
                nums.push(key);
            }
            // Add to categorical/all keys if it's a string OR a code
            if ((typeof sample[key] === 'string' && sample[key].length < 30) || isCode) {
                cats.push(key);
            }
        });
        return { numericKeys: nums, categoricalKeys: cats, allKeys: all };
    }, [populationData]);

    // [NEW] Optimize Lookup Map for Hover Performance
    const dataLookup = useMemo(() => {
        if (!populationData || level !== 'village') return null;
        const lookup = new Map();
        populationData.forEach(row => {
            // Key 1: CODE
            const code = row['Village Code'] || row.VINCODE || row.vincode;
            if (code) lookup.set(String(code).trim(), row);

            // Key 2: Strict Name (Dist|Tal|Vil)
            const d = row['District Name'] || row.DTNAME || row.District || row.DISTRICT;
            const t = row['Tehsil Name'] || row.THNAME || row.Taluka || row.Tehsil;
            const v = row['Village Name'] || row.VLNAME || row.Village;

            if (d && t && v) {
                const key = `${String(d).trim().toLowerCase()}|${String(t).trim().toLowerCase()}|${String(v).trim().toLowerCase()}`;
                lookup.set(key, row);
            }
        });
        return lookup;
    }, [populationData, level]);

    // ... existing useEffects for keys ...
    useEffect(() => {
        if (allKeys.length > 0 && Object.keys(visibleKeys).length === 0) {
            const initial = {};
            allKeys.forEach(k => { initial[k] = true; });
            setVisibleKeys(initial);
        }
    }, [allKeys]);


    useEffect(() => {
        if (numericKeys.length > 0 && !colorBy) {
            // [NEW] Default to 'Total HH Animals' if available
            if (numericKeys.includes('Total HH Animals')) {
                setColorBy('Total HH Animals');
            } else {
                setColorBy(numericKeys[0]);
            }
        }
        if (categoricalKeys.length > 0 && !filterAttribute) {
            setFilterAttribute(categoricalKeys[0]);
        }
    }, [numericKeys, categoricalKeys, colorBy, filterAttribute]);

    // ... getAggregatedData ...
    const getAggregatedData = (feature) => {
        // Same existing logic, just re-declaring to keep context if I were rewriting huge chunk
        // BUT for replace tool, I can just reference it if I don't change it.
        // Actually, to support VD coloring perfectly, I don't need to change aggregation, just style.
        // Wait, if I am replacing the WHOLE function block, I must include it.
        // I'll assume I am REPLACING the whole component content or start/end lines.
        // Since I selected a large range, I should just paste the modified component body.

        if (!populationData || !populationData.length) return null;

        const props = feature.properties;
        let matchedRows = [];

        // Match logic (District/Taluka/Village)
        if (level === 'district') {
            const code = props.DTNCODE || props.dtncode || props.DNCODE;
            const name = props.DTNAME || props.dtname || props.District || props.DISTRICT || props.Name || props.NAME;
            const searchName = String(name).trim().toLowerCase();
            if (code) matchedRows = populationData.filter(d => String(d.DTNCODE || d.DNCODE) === String(code));
            if (matchedRows.length === 0 && name) matchedRows = populationData.filter(d => {
                const dName = d['District Name'] || d.DTNAME || d.District || d.DISTRICT;
                return dName && String(dName).trim().toLowerCase() === searchName;
            });
        } else if (level === 'taluka') {
            const code = props.THNCODE || props.thncode;
            const name = props.THNAME || props.thname || props.Taluka || props.TALUKA || props.tehsil || props.Name;
            const searchName = String(name).trim().toLowerCase();
            if (code) matchedRows = populationData.filter(d => String(d.THNCODE || d.thncode) === String(code));
            if (matchedRows.length === 0 && name) matchedRows = populationData.filter(d => {
                const dName = d['Tehsil Name'] || d.THNAME || d.Taluka || d.Tehsil;
                return dName && String(dName).trim().toLowerCase() === searchName;
            });
        } else {
            // Village - Optimized Lookup
            const vCode = props.VINCODE || props.vincode;
            const name = props.VLNAME || props.vlname || props.Village || props.Name;

            if (dataLookup) {
                // Try Code Match first
                if (vCode && dataLookup.has(String(vCode).trim())) {
                    matchedRows = [dataLookup.get(String(vCode).trim())];
                }
                // Context Match
                else if (context && context.districtName && context.talukaName && name) {
                    const key = `${String(context.districtName).trim().toLowerCase()}|${String(context.talukaName).trim().toLowerCase()}|${String(name).trim().toLowerCase()}`;
                    if (dataLookup.has(key)) matchedRows = [dataLookup.get(key)];
                }
            } else {
                // Fallback (for Taluka/District or if lookup failed to build)
                // ... [Existing fallback logic if needed, but for Village we rely on lookup now for speed]
                // But we still need the old logic if dataLookup isn't ready or for non-village levels?
                // dataLookup is only built for 'village'.

                // Keep the old logic as fallback or just rely on lookup.
                // Given "lag" complaint, we should rely on lookup.

                if (vCode) {
                    const match = populationData.find(d => {
                        const rowCode = d['Village Code'] || d.VINCODE || d.vincode;
                        return rowCode && String(rowCode).trim() === String(vCode).trim();
                    });
                    if (match) matchedRows = [match];
                }
                if (matchedRows.length === 0 && name && context) {
                    // Filter only if context exists, otherwise massive scan
                    const ctxDist = String(context.districtName).trim().toLowerCase();
                    const ctxTal = String(context.talukaName).trim().toLowerCase();
                    const searchName = String(name).trim().toLowerCase();

                    const match = populationData.find(d => {
                        // Check context first to fail fast
                        const rowDist = d['District Name'] || d.DTNAME || d.District;
                        const rowTal = d['Tehsil Name'] || d.THNAME || d.Taluka;
                        if (!rowDist || !rowTal) return false;

                        if (String(rowDist).trim().toLowerCase() !== ctxDist) return false;
                        if (String(rowTal).trim().toLowerCase() !== ctxTal) return false;

                        const dName = d['Village Name'] || d.VLNAME || d.Village;
                        return dName && String(dName).trim().toLowerCase() === searchName;
                    });
                    if (match) matchedRows = [match];
                }
            }
        }

        if (matchedRows.length === 0) return null;

        const aggregated = {};
        aggregated._count = matchedRows.length;
        if (level === 'district') {
            const tehsils = new Set();
            matchedRows.forEach(row => { if (row['Tehsil Name']) tehsils.add(row['Tehsil Name']); });
            aggregated._tehsilCount = tehsils.size;
            // Capture District Code if available from first row
            aggregated['District Code'] = matchedRows[0]['District Code'] || matchedRows[0].DTNCODE || matchedRows[0].DNCODE;
        } else if (level === 'taluka') {
            // Capture Tehsil Code
            aggregated['Tehsil Code'] = matchedRows[0]['Tehsil Code'] || matchedRows[0].THNCODE || matchedRows[0].thncode;
        }

        numericKeys.forEach(key => {
            let sum = 0;
            matchedRows.forEach(row => {
                const rawVal = String(row[key]);
                const val = parseFloat(rawVal.replace(/,/g, ''));
                if (!isNaN(val) && isFinite(val)) sum += val;
            });
            aggregated[key] = sum;
        });

        categoricalKeys.forEach(key => {
            // ... existing checks ...
            aggregated[key] = matchedRows[0][key];
        });

        // Ensure we capture specific VD columns ONLY at village level
        if (level === 'village') {
            if (matchedRows[0]['VD name_Restructuring']) aggregated['VD name_Restructuring'] = matchedRows[0]['VD name_Restructuring'];
            if (matchedRows[0]['VD Name_Restructuring']) aggregated['VD Name_Restructuring'] = matchedRows[0]['VD Name_Restructuring'];
            if (matchedRows[0]['VD type_Old']) aggregated['VD type_Old'] = matchedRows[0]['VD type_Old'];
        } else {
            // For District/Taluka, count unique VDs
            const uniqueVDs = new Set();
            matchedRows.forEach(r => {
                const vd = r['VD name_Restructuring'] || r['VD Name_Restructuring'] || r['VD Name'];
                if (vd) uniqueVDs.add(vd);
            });
            aggregated._vdCount = uniqueVDs.size;
        }

        return aggregated;
    };

    // Calculate Min/Max (Filtered)
    useEffect(() => {
        if (!geoData || !colorBy) return;
        let min = Infinity;
        let max = -Infinity;
        geoData.features.forEach(f => {
            const data = getAggregatedData(f);
            if (data) {
                if (filterAttribute && filterValue !== 'All') {
                    const featVal = String(data[filterAttribute] || '').trim();
                    if (featVal !== filterValue) return;
                }
                // Urban Village filter
                if (urbanFilter !== 'All') {
                    const urbanVal = String(data['Urban Village'] || data['Urban'] || '').trim().toUpperCase();
                    if (urbanVal !== urbanFilter) return;
                }
                // Urban Tehsil filter
                if (urbanTehsilFilter !== 'All') {
                    const utVal = String(data['Urban Tehsil'] || '').trim().toUpperCase();
                    if (utVal !== urbanTehsilFilter) return;
                }
                const rawVal = String(data[colorBy]).replace(/,/g, '');
                const val = parseFloat(rawVal);
                if (!isNaN(val)) {
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }
        });
        if (min === Infinity) min = 0;
        if (max === -Infinity) max = 0;
        setStats({ min, max });
    }, [geoData, colorBy, populationData, level, filterAttribute, filterValue, urbanFilter, urbanTehsilFilter]);

    // [NEW] Import Palette (Need to add import at top of file, doing it here implies partial rewrite or I need to do 2 edits)
    // Actually, I can't add imports with replace_file_content easily if I don't target the top.
    // I'll do the style update first, then the import.

    // ... inside MapView ...

    // [NEW] Unique VDs for Consistent Coloring (Scoped to Current Context)
    const uniqueVDList = useMemo(() => {
        if (!populationData || !vdMode) return [];
        const set = new Set();

        // Context-aware filtering to ensure we only collect LOCAL VDs
        // This ensures indices range from 0..N (where N is small), preventing modulo collisions
        const currentTwLc = context?.talukaName ? String(context.talukaName).trim().toLowerCase() : null;
        const currentDistLc = context?.districtName ? String(context.districtName).trim().toLowerCase() : null;

        populationData.forEach(row => {
            // If we are deep in the hierarchy, strict filter
            if (level === 'village' && currentTwLc) {
                const tName = row['Tehsil Name'] || row.THNAME || row.Taluka;
                if (!tName || String(tName).trim().toLowerCase() !== currentTwLc) return;
            }
            // District check (optional, but good for safety)
            if ((level === 'village' || level === 'taluka') && currentDistLc) {
                const dName = row['District Name'] || row.DTNAME || row.District;
                if (!dName || String(dName).trim().toLowerCase() !== currentDistLc) return;
            }

            const vd = row['VD name_Restructuring'] || row['VD Name_Restructuring'] || row['VD Name'] || row['VD type_Old'];
            if (vd) set.add(String(vd).trim());
        });
        return Array.from(set).sort();
    }, [populationData, vdMode, context, level]);

    // VD Color Generator (Using Palette)
    const getVDColor = (vdName) => {
        if (!vdName || vdName === 'Unassigned') return '#999999';
        const index = uniqueVDList.indexOf(String(vdName).trim());
        if (index === -1) return '#999999';

        // Use the palette function (assumed imported or defined)
        // Since I can't import easily in this block, I'll assume I'll add the import later.
        // Or I can copy the array here? No, better to import.
        // I will use a placeholder or assume 'getPaletteColor' is available if I paste the import at top.
        // Let's use the tool correctly: sequential edits.
        // For now, I will put the logic here assuming the import exists.
        return getPaletteColor(index);
    };

    const getColor = (value) => {
        if (value === undefined || value === null) return '#94a3b8';
        if (stats.max === stats.min) return '#eab308';
        const numVal = parseFloat(String(value).replace(/,/g, ''));
        if (isNaN(numVal)) return '#94a3b8';
        const ratio = (numVal - stats.min) / (stats.max - stats.min);
        const hue = (1 - ratio) * 120;
        return `hsl(${hue}, 80%, 45%)`;
    };

    const style = (feature) => {
        const data = getAggregatedData(feature);
        if (!data) return { fillColor: '#cbd5e1', weight: 1, opacity: 1, color: 'white', fillOpacity: 0.8 };

        if (filterAttribute && filterValue !== 'All') {
            const featVal = String(data[filterAttribute] || '').trim();
            if (featVal !== filterValue) return { stroke: false, fill: false, opacity: 0, fillOpacity: 0 };
        }

        // Urban Village filter
        if (urbanFilter !== 'All') {
            const urbanVal = String(data['Urban Village'] || data['Urban'] || '').trim().toUpperCase();
            if (urbanVal !== urbanFilter) return { stroke: false, fill: false, opacity: 0, fillOpacity: 0 };
        }
        // Urban Tehsil filter
        if (urbanTehsilFilter !== 'All') {
            const utVal = String(data['Urban Tehsil'] || '').trim().toUpperCase();
            if (utVal !== urbanTehsilFilter) return { stroke: false, fill: false, opacity: 0, fillOpacity: 0 };
        }

        // [NEW] VD Mode Styling with Hover
        if (vdMode && level === 'village') {
            const vdName = data['VD name_Restructuring'] || data['VD Name_Restructuring'] || data['VD Name'] || data['VD type_Old'];
            const isHovered = hoveredVD && String(vdName).trim() === String(hoveredVD).trim();

            // Spotlight Effect:
            // User requested "no faint color" and "dark color"
            // So we keep EVERYTHING fully opaque (or high opacity).
            // We distinguish ONLY by border or a slight brightness shift.

            return {
                fillColor: getVDColor(vdName),
                weight: isHovered ? 3 : 1,          // Thicker white border on hover
                opacity: 1,
                color: 'white',
                dashArray: null,
                fillOpacity: 0.9,                   // Solid colors everywhere
                zIndex: isHovered ? 1000 : 1
            };
        }

        return {
            fillColor: data[colorBy] !== undefined ? getColor(data[colorBy]) : '#cbd5e1',
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.8
        };
    };

    // Filter Options
    const filterOptions = useMemo(() => {
        if (!filterAttribute || !populationData) return [];
        const unique = new Set(['All']);
        populationData.forEach(row => {
            if (row[filterAttribute]) unique.add(String(row[filterAttribute]).trim());
        });
        return Array.from(unique).sort();
    }, [populationData, filterAttribute]);

    // [NEW] Calculate VD Stats for Tooltips
    const vdStats = useMemo(() => {
        if (!populationData || !vdMode) return {};
        const stats = {};

        // Priority keys matching VDAnalysisPanel
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

        populationData.forEach(row => {
            let vdName = row['VD name_Restructuring'] || row['VD Name_Restructuring'] || row['VD Name'];
            if (!vdName) vdName = row['VD type_Old'] || "Unassigned";

            if (!stats[vdName]) stats[vdName] = { villages: 0, pop: 0 };

            let pop = 0;
            let foundKey = priorityKeys.find(k => row[k] !== undefined);
            if (!foundKey) foundKey = Object.keys(row).find(k => k.toLowerCase() === 'population' || k.toLowerCase().includes('total population'));

            if (foundKey) {
                const raw = String(row[foundKey]).replace(/,/g, '');
                pop = parseFloat(raw) || 0;
            }

            stats[vdName].villages += 1;
            stats[vdName].pop += pop;
        });
        return stats;
    }, [populationData, vdMode]);

    const onEachFeature = (feature, layer) => {
        const data = getAggregatedData(feature);
        const props = feature.properties;
        // Improved Name Fallback
        const dName = props.DTNAME || props.dtname || props.District || props.DISTRICT || props.Name || props.NAME_1 || props.district_name || '?';
        const tName = props.THNAME || props.thname || props.Taluka || props.TALUKA || props.Tehsil || props.tehsil || props.Name || props.sub_dist || '?';
        const vName = props.VLNAME || props.vlname || props.Village || props.VILLAGE || props.Name || props.village_name || '?';

        // Concise Header Logic
        let headerName = '?';
        let subText = '';

        if (level === 'district') {
            headerName = dName;
        } else if (level === 'taluka') {
            headerName = tName; // Taluka Name
            subText = dName;    // District Name as subtext
        } else {
            headerName = vName; // Village Name
            subText = tName;    // Tehsil Name as subtext
        }

        // Remove '?' if it persists in subtext to keep it clean
        if (subText === '?') subText = '';

        let tooltipContent = `<div class="font-sans min-w-[200px] text-left text-slate-700">
            <div class="px-2 py-1.5 bg-slate-50 border-b border-slate-200">
                <div class="font-bold text-sm block">${headerName}</div>
                ${subText ? `<div class="text-[10px] text-slate-500">${subText}</div>` : ''}
            </div>`;

        if (data) {
            tooltipContent += '<div class="p-2 flex flex-col gap-1.5">';

            // [NEW] VD Summary in Tooltip
            if (vdMode && level === 'village') {
                const vd = data['VD name_Restructuring'] || data['VD Name_Restructuring'] || data['VD Name'] || "Unassigned";
                const old = data['VD type_Old'];
                const s = vdStats[vd] || { villages: 0, pop: 0 };

                tooltipContent += `<div class="p-2 bg-brand-50 border border-brand-100 rounded text-xs mb-1">
                    <div class="font-bold text-brand-700 text-sm mb-1 line-clamp-1">${vd}</div>
                    <div class="grid grid-cols-2 gap-2 text-brand-800">
                        <div class="flex flex-col">
                            <span class="text-[9px] uppercase opacity-70">Villages</span>
                            <span class="font-mono font-semibold">${s.villages}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[9px] uppercase opacity-70">Total Pop</span>
                            <span class="font-mono font-semibold">${s.pop.toLocaleString()}</span>
                        </div>
                    </div>
                 </div>`;
            }

            // Urban Tehsil Status in Tooltip
            if (data['Urban Tehsil'] !== undefined) {
                const utLabel = String(data['Urban Tehsil']).trim().toUpperCase() === 'Y' ? 'Ward' : 'Village';
                const utColor = utLabel === 'Ward' ? '#7c3aed' : '#059669';
                tooltipContent += `<div class="flex justify-between items-center text-xs">
                    <span class="text-slate-500 font-medium">Tehsil Type:</span>
                    <span style="color: ${utColor}; font-weight: 700;">${utLabel}</span>
                </div>`;
            }
            // Urban Village Status in Tooltip
            const uvVal = data['Urban Village'] !== undefined ? data['Urban Village'] : data['Urban'];
            if (uvVal !== undefined) {
                const urbanLabel = String(uvVal).trim().toUpperCase() === 'Y' ? 'Urban' : 'Rural';
                const urbanColor = urbanLabel === 'Urban' ? '#7c3aed' : '#059669';
                tooltipContent += `<div class="flex justify-between items-center text-xs">
                    <span class="text-slate-500 font-medium">Village Type:</span>
                    <span style="color: ${urbanColor}; font-weight: 700;">${urbanLabel}</span>
                </div>`;
            }

            // Specific Item Population
            let popVal = 'N/A';
            if (colorBy && data[colorBy] !== undefined) {
                popVal = typeof data[colorBy] === 'number' ? Math.round(data[colorBy]).toLocaleString() : data[colorBy];
            } else if (data['Bovine Unit_21st LC']) {
                popVal = data['Bovine Unit_21st LC'];
            }

            tooltipContent += `<div class="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Population:</span>
                <span class="font-bold text-slate-800">${popVal}</span>
            </div>`;

            // Detailed Props (only if expanded)
            if (showDetailedTooltip) {
                tooltipContent += `<div class="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">`;
                Object.keys(visibleKeys).forEach(k => {
                    if (!visibleKeys[k]) return;
                    if (k === colorBy && !vdMode) return;
                    if (data[k] === undefined) return;
                    const val = typeof data[k] === 'number' ? Math.round(data[k]).toLocaleString() : data[k];
                    tooltipContent += `<div class="flex justify-between gap-2 text-[10px] text-slate-500">
                        <span class="truncate max-w-[120px] opacity-80">${k}</span>
                        <span class="font-mono text-slate-700">${val}</span>
                    </div>`;
                });
                tooltipContent += `</div>`;
            }

            tooltipContent += '</div>';
        } else {
            tooltipContent += `<div class="p-2 text-xs text-slate-400 italic">No linked data</div>`;
        }
        tooltipContent += '</div>';

        if (showHoverTooltip) {
            layer.bindTooltip(tooltipContent, {
                sticky: true, direction: 'auto', opacity: 1,
                className: '!opacity-100 !border-0 !p-0 shadow-xl rounded-md overflow-hidden bg-white z-[9999]'
            });
        }

        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({ weight: 2, color: '#333', fillOpacity: 0.9 });
                layer.bringToFront();
                setHoveredData({ feature: feature, data: getAggregatedData(feature) });
            },
            mouseout: (e) => {
                // Reset style
                if (vdMode && level === 'village') {
                    const d = getAggregatedData(feature);
                    const vdName = d ? (d['VD name_Restructuring'] || d['VD Name_Restructuring'] || d['VD Name'] || d['VD type_Old']) : null;
                    layer.setStyle({
                        weight: 1, color: 'white', fillColor: getVDColor(vdName),
                        dashArray: null, fillOpacity: 0.8
                    });
                } else {
                    layer.setStyle({ weight: 2, color: 'white', dashArray: '3', fillOpacity: 0.8 });
                }
                setHoveredData(null);
            },
            click: (e) => onFeatureClick(feature, layer)
        });
    };

    return (
        <div className="relative h-full w-full bg-white">
            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 users-select-none">
                {/* ... controls ... */}
                {!vdMode && (
                    <div className="bg-white rounded shadow-md p-3 flex flex-col gap-3 min-w-[200px] max-h-[80vh] overflow-y-auto">
                        {/* Only show these regular map settings if NOT in VD Mode, or maybe allow overlays? */}
                        {/* Actually user might want to filter even in VD Mode, but color is locked. */}
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Map Settings</div>

                        {/* [NEW] Toggles */}
                        <div className="flex flex-col gap-2 mb-2 pb-2 border-b border-slate-100">
                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={showHoverTooltip}
                                    onChange={e => setShowHoverTooltip(e.target.checked)}
                                    className="rounded text-brand-600 focus:ring-brand-500"
                                />
                                Enable Hover Tooltip
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={showTiles}
                                    onChange={e => setShowTiles(e.target.checked)}
                                    className="rounded text-brand-600 focus:ring-brand-500"
                                />
                                Show India Map (Tiles)
                            </label>
                        </div>

                        {numericKeys.length > 0 && (
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Color By Attribute</label>
                                <select className="w-full text-sm p-1 bg-slate-50 border border-slate-200 rounded"
                                    value={colorBy} onChange={(e) => setColorBy(e.target.value)}
                                >
                                    {numericKeys.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                        )}
                        {/* Urban Tehsil Filter (Ward / Village) */}
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Tehsil Type (Ward / Village)</label>
                            <select className="w-full text-sm p-1 bg-slate-50 border border-slate-200 rounded"
                                value={urbanTehsilFilter} onChange={(e) => setUrbanTehsilFilter(e.target.value)}
                            >
                                <option value="All">All</option>
                                <option value="Y">Ward (Urban Tehsil)</option>
                                <option value="N">Village (Rural Tehsil)</option>
                            </select>
                        </div>
                        {/* Collapsible Urban Village Filter */}
                        <div className="border border-slate-100 rounded">
                            <button
                                className="text-xs font-semibold text-slate-600 flex items-center justify-between w-full p-1.5 hover:bg-slate-50 transition-colors"
                                onClick={() => setShowUrbanFilters(!showUrbanFilters)}
                            >
                                <span>Urban Village Filter</span>
                                <span className="text-[10px]">{showUrbanFilters ? '▼' : '▶'}</span>
                            </button>
                            {showUrbanFilters && (
                                <div className="px-1.5 pb-1.5">
                                    <select className="w-full text-sm p-1 bg-slate-50 border border-slate-200 rounded"
                                        value={urbanFilter} onChange={(e) => setUrbanFilter(e.target.value)}
                                    >
                                        <option value="All">All</option>
                                        <option value="Y">Urban (Y)</option>
                                        <option value="N">Rural (N)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        {/* ... rest of panels ... */}
                    </div>
                )}

                {vdMode && (
                    <div className="bg-white rounded shadow-md p-3 min-w-[200px] border-l-4 border-brand-500">
                        <div className="font-bold text-brand-700 text-sm mb-1">VD Analysis Mode</div>
                        <p className="text-[10px] text-slate-500">
                            Villages are colored by their assigned Veterinary Dispensary.
                            Use the panel on the right to edit assignments.
                        </p>
                    </div>
                )}

                {/* Keep Tooltip Config always accessible */}
                <div className="bg-white rounded shadow p-2">
                    <button
                        className="text-xs font-semibold text-brand-600 flex items-center justify-between w-full"
                        onClick={() => setIsTooltipConfigOpen(!isTooltipConfigOpen)}
                    >
                        <span>Configure Tooltips</span>
                        <span>{isTooltipConfigOpen ? '▼' : '▶'}</span>
                    </button>
                    {isTooltipConfigOpen && (
                        <div className="mt-2 flex flex-col gap-1 max-h-[150px] overflow-y-auto border border-slate-100 p-1 rounded bg-slate-50">
                            {allKeys.map(key => (
                                <label key={key} className="flex items-center gap-2 text-[10px] text-slate-600">
                                    <input type="checkbox" checked={!!visibleKeys[key]}
                                        onChange={(e) => setVisibleKeys(prev => ({ ...prev, [key]: e.target.checked }))}
                                    />
                                    <span className="truncate">{key}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Fixed Details Panel (LEFT SIDEBAR) */}
            {hoveredData && (
                <div className="absolute top-20 bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-2xl border border-slate-200 min-w-[300px] w-auto max-w-[400px] flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-200">
                    {/* ... Existing Details Header ... */}
                    <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-start shrink-0">
                        {(() => {
                            const props = hoveredData.feature.properties;
                            // Better name fallback
                            const dName = props.DTNAME || props.dtname || props.District || props.DISTRICT || props.Name || props.NAME_1 || props.district_name || '?';
                            const tName = props.THNAME || props.thname || props.Taluka || props.TALUKA || props.Tehsil || props.tehsil || props.Name || props.sub_dist || '?';
                            const vName = props.VLNAME || props.vlname || props.Village || props.VILLAGE || props.Name || '?';

                            let title = dName;
                            if (level === 'taluka') title = tName;
                            if (level === 'village') title = vName;

                            return (
                                <div className="flex flex-col gap-1">
                                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{title}</h3>
                                    {level === 'village' && <div className="text-xs text-slate-500">{tName}, {dName}</div>}
                                    {level === 'taluka' && <div className="text-xs text-slate-500">{dName}</div>}
                                </div>
                            );
                        })()}
                        <button onClick={() => setHoveredData(null)} className="text-slate-400 hover:text-red-500">×</button>
                    </div>

                    <div className="p-3 overflow-y-auto custom-scrollbar flex-1">
                        {hoveredData.data ? (
                            <div className="flex flex-col gap-2">
                                {/* VD CARD IN PANEL - Only for Village Level */}
                                {(level === 'village' && (vdMode || hoveredData.data['VD name_Restructuring'])) && (
                                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded mb-2">
                                        <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider mb-1">Veterinary Dispensary</div>
                                        <div className="font-bold text-indigo-900 text-lg">
                                            {hoveredData.data['VD name_Restructuring'] || hoveredData.data['VD Name_Restructuring'] || "Unassigned"}
                                        </div>
                                        <div className="text-xs text-indigo-600 mt-1">
                                            Type: {hoveredData.data['VD type_Old'] || 'Unknown'}
                                        </div>
                                    </div>
                                )}

                                {/* COUNTS Section (District/Taluka) */}
                                {level !== 'village' && (
                                    <div className="grid grid-cols-2 gap-2 mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded">
                                        {level === 'district' && (
                                            <div className="flex flex-col items-center p-1 bg-white rounded shadow-sm">
                                                <span className="text-[9px] text-slate-500 uppercase font-bold">Tehsils</span>
                                                <span className="text-lg font-bold text-indigo-700">{hoveredData.data._tehsilCount}</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col items-center p-1 bg-white rounded shadow-sm">
                                            <span className="text-[9px] text-slate-500 uppercase font-bold">Villages</span>
                                            <span className="text-lg font-bold text-indigo-700">{hoveredData.data._count}</span>
                                        </div>
                                        <div className="flex flex-col items-center p-1 bg-white rounded shadow-sm col-span-2">
                                            <span className="text-[9px] text-slate-500 uppercase font-bold">Total VDs</span>
                                            <span className="text-lg font-bold text-indigo-700">{hoveredData.data._vdCount}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Standard Metric */}
                                {colorBy && hoveredData.data[colorBy] !== undefined && (
                                    <div className="flex justify-between items-center p-3 bg-brand-50 rounded border border-brand-100 mb-2">
                                        <span className="font-semibold text-brand-800 text-sm">{colorBy}</span>
                                        <span className="font-bold text-brand-700 text-lg">{typeof hoveredData.data[colorBy] === 'number' ? hoveredData.data[colorBy].toLocaleString() : hoveredData.data[colorBy]}</span>
                                    </div>
                                )}

                                {/* Other Details */}
                                {/* Other Details */}
                                <div className="grid grid-cols-1 gap-1">
                                    {/* Location Info First - Context Aware */}
                                    {/* District Level */}
                                    {level === 'district' && (
                                        <>
                                            <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                <span className="text-indigo-800 font-semibold">District Name</span>
                                                <span className="font-mono text-indigo-900">{hoveredData.data['District Name'] || hoveredData.feature.properties.dtname || '?'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                <span className="text-indigo-800 font-semibold">District Code</span>
                                                <span className="font-mono text-indigo-900">{hoveredData.data['District Code'] || hoveredData.feature.properties.dtncode}</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Taluka Level */}
                                    {level === 'taluka' && (
                                        <>
                                            <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                <span className="text-indigo-800 font-semibold">District</span>
                                                <span className="font-mono text-indigo-900">{hoveredData.data['District Name'] || hoveredData.feature.properties.dtname}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                <span className="text-indigo-800 font-semibold">Tehsil Name</span>
                                                <span className="font-mono text-indigo-900">{hoveredData.data['Tehsil Name'] || hoveredData.feature.properties.thname || '?'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                <span className="text-indigo-800 font-semibold">Tehsil Code</span>
                                                <span className="font-mono text-indigo-900">{hoveredData.data['Tehsil Code'] || hoveredData.feature.properties.thncode}</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Village Level */}
                                    {level === 'village' && (
                                        <>
                                            <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                <span className="text-indigo-800 font-semibold">District</span>
                                                <span className="font-mono text-indigo-900">{hoveredData.data['District Name']}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                <span className="text-indigo-800 font-semibold">Tehsil</span>
                                                <span className="font-mono text-indigo-900">{hoveredData.data['Tehsil Name']}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                <span className="text-indigo-800 font-semibold">Village Name</span>
                                                <span className="font-mono text-indigo-900">{hoveredData.data['Village Name']}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                <span className="text-indigo-800 font-semibold">Village Code</span>
                                                <span className="font-mono text-indigo-900">{hoveredData.data['Village Code'] || hoveredData.feature.properties.vincode}</span>
                                            </div>
                                            {hoveredData.data['Urban Tehsil'] !== undefined && (
                                                <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                    <span className="text-indigo-800 font-semibold">Tehsil Type</span>
                                                    <span className={`font-mono font-bold ${String(hoveredData.data['Urban Tehsil']).trim().toUpperCase() === 'Y' ? 'text-violet-700' : 'text-emerald-700'}`}>
                                                        {String(hoveredData.data['Urban Tehsil']).trim().toUpperCase() === 'Y' ? 'Ward' : 'Village'}
                                                    </span>
                                                </div>
                                            )}
                                            {(hoveredData.data['Urban Village'] !== undefined || hoveredData.data['Urban'] !== undefined) && (
                                                <div className="flex justify-between items-center text-xs py-1 border-b border-indigo-100 bg-indigo-50/50 px-1 rounded">
                                                    <span className="text-indigo-800 font-semibold">Urban Village</span>
                                                    {(() => {
                                                        const uv = hoveredData.data['Urban Village'] || hoveredData.data['Urban'];
                                                        const isUrban = String(uv).trim().toUpperCase() === 'Y';
                                                        return (
                                                            <span className={`font-mono font-bold ${isUrban ? 'text-violet-700' : 'text-emerald-700'}`}>
                                                                {isUrban ? 'Urban' : 'Rural'}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Rest of keys */}
                                    {Object.entries(hoveredData.data)
                                        .filter(([key]) => visibleKeys[key] &&
                                            key !== colorBy &&
                                            !key.startsWith('_') &&
                                            !key.includes('VD ') &&
                                            !['District Name', 'District Code', 'Tehsil Name', 'Tehsil Code', 'Village Name', 'Village Code', 'Urban Village', 'Urban Tehsil', 'Urban'].includes(key)
                                        )
                                        .map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-center text-xs py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-1 rounded">
                                                <span className="text-slate-500 font-medium truncate max-w-[150px]" title={key}>{key}</span>
                                                <span className="font-bold text-slate-700">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">No Data</div>
                        )}
                    </div>
                </div>
            )}

            <MapContainer
                center={[19.7515, 75.7139]}
                zoom={7}
                style={{ height: '100%', width: '100%', background: '#fff' }}
                zoomControl={false}
            >
                {showTiles && <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />}
                {geoData && (
                    <GeoJSON
                        key={level + (geoData.features?.length || 0) + colorBy + vdMode + urbanFilter + urbanTehsilFilter}
                        data={geoData}
                        style={style}
                        onEachFeature={onEachFeature}
                    />
                )}
                <MapController geoData={geoData} />
            </MapContainer>
        </div>
    );
};


