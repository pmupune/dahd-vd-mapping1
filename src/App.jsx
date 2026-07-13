import React, { useState, useMemo, useEffect } from 'react';
import FileManager from './components/FileManager';
import MapView from './components/MapView';
import { Layers, Map as MapIcon, ChevronLeft, Home } from 'lucide-react';
import VDAnalysisPanel from './components/VDAnalysisPanel';

function App() {
  const [dataStore, setDataStore] = useState({
    district: null,
    taluka: null,
    village: null,
    population: []
  });

  const [viewState, setViewState] = useState({
    level: 'district', // district, taluka, village
    filters: {} // { districtName: '...', talukaName: '...' }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showVDPanel, setShowVDPanel] = useState(false);
  const [hoveredVD, setHoveredVD] = useState(null);

  // Default Data Loading
  // Default Data Loading
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        // Load GeoJSONs
        const rules = [
          { type: 'district', path: '/map/mh_Districts_New.geojson' },
          { type: 'taluka', path: '/map/mh_Talukas_New.geojson' },
          { type: 'village', path: '/map/mh_Villages_New.geojson' }
        ];

        for (const r of rules) {
          if (dataStore[r.type]) continue;
          try {
            const resp = await fetch(r.path);
            if (resp.ok) {
              const d = await resp.json();
              setDataStore(prev => ({ ...prev, [r.type]: d }));
              if (r.type === 'district') setIsSidebarOpen(false);
            }
          } catch (e) { console.warn("Failed " + r.path); }
        }

        // Load Population
        if (dataStore.population.length === 0) {
          try {
            const resp = await fetch('/map/Data.xlsx');
            if (resp.ok) {
              const blob = await resp.blob();
              const updateData = (parsed) => setDataStore(prev => ({ ...prev, population: parsed }));

              // Dynamic Import
              const XLSX = await import('xlsx');
              const reader = new FileReader();
              reader.onload = (e) => {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheet = workbook.SheetNames[0];
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
                console.log("Auto-loaded Population Data", jsonData, jsonData.length);
                updateData(jsonData);
              };
              reader.readAsBinaryString(blob);
            }
          } catch (e) { console.warn("No default population data"); }
        }

      } catch (e) { console.error(e); }
    };

    loadDefaultData();
  }, []); // Run once on mount

  const handleDataLoad = (type, data) => {
    setDataStore(prev => ({ ...prev, [type]: data }));

    // If loading district data, reset view
    if (type === 'district') {
      setViewState({ level: 'district', filters: {} });
    }
  };

  const handleUpdateVillageVD = (villageRow, newVDName) => {
    // We need to update the population data in datastore
    // 1. Find the index
    const newData = [...dataStore.population];
    const index = newData.findIndex(r => r === villageRow); // Reference equality check should work if we passed the object directly

    if (index !== -1) {
      // 2. Clone the row and update 'VD name_Restructuring'
      newData[index] = {
        ...newData[index],
        'VD name_Restructuring': newVDName
      };

      // 3. Update Store
      setDataStore(prev => ({ ...prev, population: newData }));
    }
  };

  const activeGeoData = useMemo(() => {
    const { level, filters } = viewState;
    const source = dataStore[level];

    if (!source) return null;

    // Filter logic
    if (level === 'taluka' && filters.districtCode) {
      // ... existing logic ...
      const features = source.features.filter(f => {
        const props = f.properties;
        const pDistCode = props.DTNCODE || props.dtncode || props.DNCODE;
        const pDistName = props.DTNAME || props.dtname || props.District || props.DISTRICT || props.Name;

        if (pDistCode && filters.districtCode) {
          return String(pDistCode).trim() === String(filters.districtCode).trim();
        }
        if (filters.districtName && pDistName) {
          return String(pDistName).trim().toLowerCase() === String(filters.districtName).trim().toLowerCase();
        }
        return true;
      });
      return { ...source, features };
    }

    if (level === 'village' && filters.talukaCode) {
      // ... existing logic ...
      const features = source.features.filter(f => {
        const props = f.properties;
        const pTalukaCode = props.THNCODE || props.thncode;
        const pTalukaName = props.THNAME || props.thname || props.Taluka || props.TALUKA;

        // Taluka Match
        let talukaMatch = false;
        if (pTalukaCode && filters.talukaCode) {
          talukaMatch = String(pTalukaCode).trim() === String(filters.talukaCode).trim();
        } else if (pTalukaName && filters.talukaName) {
          talukaMatch = String(pTalukaName).trim().toLowerCase() === String(filters.talukaName).trim().toLowerCase();
        } else {
          talukaMatch = true;
        }

        // District Match
        const pDistCode = props.DTNCODE || props.dtncode || props.DNCODE;
        const pDistName = props.DTNAME || props.dtname || props.District || props.DISTRICT;
        let districtMatch = true;
        if (filters.districtCode && pDistCode) {
          districtMatch = String(pDistCode).trim() === String(filters.districtCode).trim();
        } else if (filters.districtName && pDistName) {
          districtMatch = String(pDistName).trim().toLowerCase() === String(filters.districtName).trim().toLowerCase();
        }

        return talukaMatch && districtMatch;
      });
      return { ...source, features };
    }

    return source;
  }, [dataStore, viewState]);

  const handleFeatureClick = (feature, layer) => {
    const props = feature.properties;

    // Identify keys
    // District Level
    const dCode = props.DTNCODE || props.dtncode || props.DNCODE;
    const dName = props.DTNAME || props.dtname || props.District || props.DISTRICT || props.Name;

    // Taluka Level
    const tCode = props.THNCODE || props.thncode;
    const tName = props.THNAME || props.thname || props.Taluka || props.TALUKA || props.Name;

    console.log(`Clicked feature at ${viewState.level}:`, props);

    if (viewState.level === 'district') {
      // Drill down to taluka
      if (dataStore.taluka) {
        setViewState({
          level: 'taluka',
          filters: {
            districtName: dName,
            districtCode: dCode
          }
        });
      } else {
        alert("Please upload Taluka GeoJSON data first.");
      }
    } else if (viewState.level === 'taluka') {
      // Drill down to village
      if (dataStore.village) {
        setViewState(prev => ({
          level: 'village',
          filters: {
            ...prev.filters,
            talukaName: tName,
            talukaCode: tCode
          }
        }));
      } else {
        alert("Please upload Village GeoJSON data first.");
      }
    }
  };

  const handleBack = () => {
    if (viewState.level === 'village') {
      setViewState(prev => ({ level: 'taluka', filters: { ...prev.filters, talukaName: undefined } }));
    } else if (viewState.level === 'taluka') {
      setViewState({ level: 'district', filters: {} });
    }
  };

  const handleReset = () => {
    setViewState({ level: 'district', filters: {} });
  };

  // Toggle for Analysis Mode
  // If we are at Taluka level (listing villages), we can show the VD Panel?
  // Actually, usually we analyze VDs FOR a Taluka. So when 'Taluka' is selected in the dropdown (viewState.filters.talukaName),
  // AND we are looking at the map of villages (level='village').

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white h-full shadow-lg z-20 flex-shrink-0 transition-all duration-300 relative`}>
        {/* ... existing sidebar ... */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50 overflow-hidden shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <MapIcon className="text-brand-600 min-w-[20px] w-5 h-5" />
            <h1 className="font-bold text-slate-800 text-lg truncate">GeoMapper</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="h-[calc(100vh-65px)] overflow-hidden">
          <FileManager onDataLoaded={handleDataLoad} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-slate-100">

        {/* Toggle Sidebar Button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-24 left-0 z-[50] bg-white p-2 rounded-r shadow-md text-slate-600 hover:text-brand-600 border border-l-0 border-slate-200"
            title="Show Data Management"
          >
            <MapIcon size={20} />
          </button>
        )}

        {/* Toolbar */}
        <div className={`absolute top-4 z-[1000] flex gap-2 flex-wrap max-w-[calc(100%-200px)] transition-all duration-300 ${!isSidebarOpen ? 'left-12' : 'left-4'}`}>
          {(viewState.level !== 'district') && (
            <button
              onClick={handleBack}
              className="bg-white p-2 rounded shadow text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
            >
              <ChevronLeft size={20} /> Back
            </button>
          )}
          <button onClick={handleReset} className="bg-white p-2 rounded shadow text-slate-700 hover:bg-slate-50" title="Reset">
            <Home size={20} />
          </button>

          {/* District Selector */}
          {dataStore.district && (
            <select
              className="bg-white p-2 rounded shadow text-sm border-none outline-none focus:ring-2 ring-brand-500 max-w-[150px]"
              onChange={(e) => {
                const val = e.target.value;
                if (!val) { handleReset(); return; }
                if (dataStore.taluka) {
                  setViewState({ level: 'taluka', filters: { districtName: val } });
                } else {
                  alert("Please upload Taluka data first.");
                }
              }}
              value={viewState.filters.districtName || ''}
            >
              <option value="">Select District</option>
              {dataStore.district.features.map((f, i) => {
                const p = f.properties;
                const name = p.DNCODE || p.DTNAME || p.dtname || p.District || p.Name;
                return name ? <option key={i} value={name}>{name}</option> : null;
              }).filter(Boolean).filter((v, i, a) => a.findIndex(t => t.props.value === v.props.value) === i).sort((a, b) => String(a.props.children).localeCompare(String(b.props.children)))}
            </select>
          )}

          {/* Taluka Selector */}
          {viewState.filters.districtName && dataStore.taluka && (
            <select
              className="bg-white p-2 rounded shadow text-sm border-none outline-none focus:ring-2 ring-brand-500 max-w-[150px]"
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setViewState(prev => ({ level: 'taluka', filters: { districtName: prev.filters.districtName } }));
                  return;
                }
                if (dataStore.village) {
                  setViewState(prev => ({ level: 'village', filters: { ...prev.filters, talukaName: val, villageName: undefined } }));
                } else {
                  alert("Please upload Village data first.");
                }
              }}
              value={viewState.filters.talukaName || ''}
            >
              <option value="">Select Taluka</option>
              {dataStore.taluka.features
                .filter(f => {
                  const p = f.properties;
                  const pDist = p.District || p.DISTRICT || p.district || p.dtname || p.DTNAME || p.DNCODE || p.Name;
                  return !pDist || String(pDist).trim().toLowerCase() === String(viewState.filters.districtName).trim().toLowerCase();
                })
                .map((f, i) => {
                  const p = f.properties;
                  const name = p.THNAME || p.thname || p.Taluka || p.TALUKA || p.Name;
                  return name ? <option key={i} value={name}>{name}</option> : null;
                }).filter(Boolean).filter((v, i, a) => a.findIndex(t => t.props.value === v.props.value) === i).sort((a, b) => String(a.props.children).localeCompare(String(b.props.children)))}
            </select>
          )}

          {/* VD Mode Toggle */}
          {viewState.level === 'village' && viewState.filters.talukaName && (
            <button
              onClick={() => setShowVDPanel(!showVDPanel)}
              className={`p-2 rounded shadow text-sm font-semibold border flex items-center gap-2 transition-colors ${showVDPanel ? 'bg-brand-600 text-white border-brand-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {showVDPanel ? 'Hide VD Panel' : 'Analyze VDs'}
            </button>
          )}

        </div>

        <div className="flex-1 w-full h-full relative min-h-0 flex overflow-hidden">
          <div className="flex-1 relative">
            <MapView
              geoData={activeGeoData}
              level={viewState.level}
              onFeatureClick={handleFeatureClick}
              populationData={dataStore.population}
              // Pass VD specific props
              vdMode={showVDPanel}
              context={viewState.filters}
              hoveredVD={hoveredVD}
            />
          </div>

          {/* VD Analysis Panel (Right Side) */}
          {showVDPanel && viewState.filters.talukaName && (
            <div className="h-full z-10 shrink-0">
              <VDAnalysisPanel
                currentTaluka={viewState.filters.talukaName}
                populationData={dataStore.population}
                onUpdateVillageVD={handleUpdateVillageVD}
                onHoverVD={setHoveredVD}
              />
            </div>
          )}
        </div>

      </div>

      {/* Author Credit */}
      <div className="absolute bottom-1 right-1 z-[2000] bg-white/80 backdrop-blur px-2 py-0.5 rounded-sm border border-slate-200 text-[10px] text-slate-500 shadow-sm pointer-events-auto">
        Designed and developed by <a href="https://tanujjane.live/" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline font-medium">Tanuj Jane</a>
      </div>
    </div>
  );
}

export default App;
