import React, { useRef, useState } from 'react';
import { compileAlgs, ALGORITHM_TYPES, type AlgorithmType, type EmittedFile } from './algCompilerCore';

const emittedFileName = (file: EmittedFile): string => {
  switch (file.kind) {
    case 'newAlgs':
      return `new_${file.label}_algs.json`;
    case 'repairedRaw':
      return `raw${file.label.toUpperCase()}data.json`;
    default: {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').split('.')[0];
      return `compiled-algs-${file.label}-${timestamp}.json`;
    }
  }
};

const downloadEmittedFile = (file: EmittedFile) => {
  const blob = new Blob([file.contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = emittedFileName(file);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const TYPE_LABELS: Record<AlgorithmType, string> = {
  f2l: 'F2L',
  zbls: 'ZBLS',
  oll: 'OLL',
  pll: 'PLL',
  zbll: 'ZBLL',
};

export const AlgCompiler: React.FC = () => {
  const isCompilingRef = useRef(false);

  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedAlgTypes, setSelectedAlgTypes] = useState<Set<AlgorithmType>>(new Set());

  const handleAlgTypeToggle = (algType: AlgorithmType) => {
    setSelectedAlgTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(algType)) {
        newSet.delete(algType);
      } else {
        newSet.add(algType);
      }
      return newSet;
    });
  };

  const handleCompileAlgorithms = () => {
    if (selectedAlgTypes.size === 0) {
      alert('Please select at least one algorithm type to compile.');
      isCompilingRef.current = false;
      setIsCompiling(false);
      return;
    }

    try {
      compileAlgs({
        types: selectedAlgTypes,
        emit: downloadEmittedFile,
        shouldContinue: () => isCompilingRef.current,
      });
    } catch (error) {
      console.error('Error compiling algorithms:', error);
    } finally {
      isCompilingRef.current = false;
      setIsCompiling(false);
    }
  };

  const handleToggleCompile = () => {
    if (isCompilingRef.current) {
      isCompilingRef.current = false;
      setIsCompiling(false);
      return;
    }

    isCompilingRef.current = true;
    setIsCompiling(true);
    handleCompileAlgorithms();
  };

  return (
    <div className="flex flex-col gap-4 text-primary-100">

      <div className="flex flex-col">
        <h3 className="text-lg font-semibold">Select Algorithm Types to Compile:</h3>
        <div className="flex space-x-10">
          {ALGORITHM_TYPES.map(algType => (
            <label key={algType} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedAlgTypes.has(algType)}
                onChange={() => handleAlgTypeToggle(algType)}
                className="w-4 h-4"
              />
              <span>{TYPE_LABELS[algType]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={handleToggleCompile}
          disabled={selectedAlgTypes.size === 0}
          className={`p-3 rounded-sm border border-primary-100 hover:border-primary-500 ${
            selectedAlgTypes.size === 0
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-black hover:bg-gray-800'
          }`}
        >
          {isCompiling ? 'Compiling. Click to Cancel.' : `Compile Selected Algs (${selectedAlgTypes.size} type${selectedAlgTypes.size > 1 ? 's' : ''})`}
        </button>
        {selectedAlgTypes.size === 0 && (
          <span className="">Select at least one algorithm type</span>
        )}
      </div>
    </div>
  );
};
