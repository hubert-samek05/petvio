'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Droplets, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ChevronDown, 
  ChevronUp,
  PawPrint,
  Calculator,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Save,
  Camera,
  Upload,
  X,
  Loader2
} from 'lucide-react';
import Tesseract from 'tesseract.js';

interface BloodParameter {
  id: string;
  name: string;
  namePl: string;
  unit: string;
  dogMin: number;
  dogMax: number;
  catMin: number;
  catMax: number;
  value: number;
  category: 'morphology' | 'biochemistry' | 'electrolytes' | 'hormones';
}

interface AnalysisResult {
  parameter: string;
  status: 'normal' | 'low' | 'high';
  deviation: number;
  interpretation: string;
  possibleCauses: string[];
  dietaryRecommendations: string[];
  urgency: 'low' | 'medium' | 'high';
}

export default function BloodAnalysis() {
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [petSpecies, setPetSpecies] = useState<'dog' | 'cat'>('dog');
  const [petAge, setPetAge] = useState<number>(5);
  const [showForm, setShowForm] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parameters, setParameters] = useState<BloodParameter[]>([
    // Morphology
    { id: 'rbc', name: 'RBC', namePl: 'Erytrocyty', unit: '10^6/µL', dogMin: 5.5, dogMax: 8.5, catMin: 5.0, catMax: 10.0, value: 0, category: 'morphology' },
    { id: 'hgb', name: 'HGB', namePl: 'Hemoglobina', unit: 'g/dL', dogMin: 12.0, dogMax: 18.0, catMin: 8.0, catMax: 15.0, value: 0, category: 'morphology' },
    { id: 'hct', name: 'HCT', namePl: 'Hematokryt', unit: '%', dogMin: 37.0, dogMax: 55.0, catMin: 30.0, catMax: 45.0, value: 0, category: 'morphology' },
    { id: 'mcv', name: 'MCV', namePl: 'MCV', unit: 'fL', dogMin: 60.0, dogMax: 77.0, catMin: 35.0, catMax: 55.0, value: 0, category: 'morphology' },
    { id: 'mch', name: 'MCH', namePl: 'MCH', unit: 'pg', dogMin: 19.5, dogMax: 24.5, catMin: 12.0, catMax: 17.0, value: 0, category: 'morphology' },
    { id: 'mchc', name: 'MCHC', namePl: 'MCHC', unit: 'g/dL', dogMin: 32.0, dogMax: 36.0, catMin: 28.0, catMax: 33.0, value: 0, category: 'morphology' },
    { id: 'wbc', name: 'WBC', namePl: 'Leukocyty', unit: '10^3/µL', dogMin: 6.0, dogMax: 17.0, catMin: 5.5, catMax: 19.5, value: 0, category: 'morphology' },
    { id: 'plt', name: 'PLT', namePl: 'Trombocyty', unit: '10^3/µL', dogMin: 150.0, dogMax: 400.0, catMin: 175.0, catMax: 500.0, value: 0, category: 'morphology' },
    
    // Biochemistry
    { id: 'alt', name: 'ALT', namePl: 'ALT (SGPT)', unit: 'U/L', dogMin: 10.0, dogMax: 100.0, catMin: 10.0, catMax: 100.0, value: 0, category: 'biochemistry' },
    { id: 'ast', name: 'AST', namePl: 'AST (SGOT)', unit: 'U/L', dogMin: 10.0, dogMax: 50.0, catMin: 10.0, catMax: 50.0, value: 0, category: 'biochemistry' },
    { id: 'alp', name: 'ALP', namePl: 'ALP', unit: 'U/L', dogMin: 20.0, dogMax: 150.0, catMin: 10.0, catMax: 70.0, value: 0, category: 'biochemistry' },
    { id: 'ggt', name: 'GGT', namePl: 'GGT', unit: 'U/L', dogMin: 0.0, dogMax: 10.0, catMin: 0.0, catMax: 5.0, value: 0, category: 'biochemistry' },
    { id: 'tbil', name: 'TBIL', namePl: 'Bilirubina całkowita', unit: 'mg/dL', dogMin: 0.1, dogMax: 0.6, catMin: 0.1, catMax: 0.4, value: 0, category: 'biochemistry' },
    { id: 'albumin', name: 'ALB', namePl: 'Albumina', unit: 'g/dL', dogMin: 2.7, dogMax: 4.4, catMin: 2.5, catMax: 4.0, value: 0, category: 'biochemistry' },
    { id: 'globulin', name: 'GLOB', namePl: 'Globulina', unit: 'g/dL', dogMin: 2.0, dogMax: 4.0, catMin: 2.5, catMax: 5.0, value: 0, category: 'biochemistry' },
    { id: 'tp', name: 'TP', namePl: 'Białko całkowite', unit: 'g/dL', dogMin: 5.5, dogMax: 7.5, catMin: 6.0, catMax: 8.5, value: 0, category: 'biochemistry' },
    { id: 'bun', name: 'BUN', namePl: 'Mocznik', unit: 'mg/dL', dogMin: 7.0, dogMax: 27.0, catMin: 15.0, catMax: 30.0, value: 0, category: 'biochemistry' },
    { id: 'creatinine', name: 'CRE', namePl: 'Kreatynina', unit: 'mg/dL', dogMin: 0.5, dogMax: 1.5, catMin: 0.8, catMax: 2.4, value: 0, category: 'biochemistry' },
    { id: 'glucose', name: 'GLU', namePl: 'Glukoza', unit: 'mg/dL', dogMin: 70.0, dogMax: 120.0, catMin: 70.0, catMax: 150.0, value: 0, category: 'biochemistry' },
    { id: 'cholesterol', name: 'CHOL', namePl: 'Cholesterol', unit: 'mg/dL', dogMin: 110.0, dogMax: 330.0, catMin: 75.0, catMax: 250.0, value: 0, category: 'biochemistry' },
    
    // Electrolytes
    { id: 'sodium', name: 'NA', namePl: 'Sód', unit: 'mmol/L', dogMin: 140.0, dogMax: 155.0, catMin: 150.0, catMax: 165.0, value: 0, category: 'electrolytes' },
    { id: 'potassium', name: 'K', namePl: 'Potas', unit: 'mmol/L', dogMin: 3.5, dogMax: 5.5, catMin: 3.5, catMax: 5.5, value: 0, category: 'electrolytes' },
    { id: 'chloride', name: 'CL', namePl: 'Chlorki', unit: 'mmol/L', dogMin: 105.0, dogMax: 120.0, catMin: 110.0, catMax: 125.0, value: 0, category: 'electrolytes' },
    { id: 'calcium', name: 'CA', namePl: 'Wapń całkowity', unit: 'mg/dL', dogMin: 8.8, dogMax: 11.5, catMin: 8.0, catMax: 11.5, value: 0, category: 'electrolytes' },
    { id: 'phosphorus', name: 'PHOS', namePl: 'Fosfor', unit: 'mg/dL', dogMin: 2.5, dogMax: 6.0, catMin: 3.0, catMax: 7.0, value: 0, category: 'electrolytes' },
  ]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setPets([
        { id: '1', name: 'Burek', species: 'dog', age: 5 },
        { id: '2', name: 'Mia', species: 'cat', age: 3 },
      ]);
      setSelectedPet('1');
      setPetSpecies('dog');
      setPetAge(5);
    }
  }, []);

  const analyzeParameter = (param: BloodParameter): AnalysisResult => {
    const min = petSpecies === 'dog' ? param.dogMin : param.catMin;
    const max = petSpecies === 'dog' ? param.dogMax : param.catMax;
    
    if (param.value === 0) {
      return {
        parameter: param.namePl,
        status: 'normal',
        deviation: 0,
        interpretation: 'Brak danych do analizy',
        possibleCauses: [],
        dietaryRecommendations: [],
        urgency: 'low'
      };
    }

    let status: 'normal' | 'low' | 'high' = 'normal';
    let deviation = 0;

    if (param.value < min) {
      status = 'low';
      deviation = ((min - param.value) / min) * 100;
    } else if (param.value > max) {
      status = 'high';
      deviation = ((param.value - max) / max) * 100;
    }

    const interpretation = getInterpretation(param.id, status, petSpecies, petAge);
    const causes = getPossibleCauses(param.id, status, petSpecies);
    const dietary = getDietaryRecommendations(param.id, status, petSpecies);
    const urgency = getUrgency(param.id, status, deviation);

    return {
      parameter: param.namePl,
      status,
      deviation,
      interpretation: interpretation,
      possibleCauses: causes,
      dietaryRecommendations: dietary,
      urgency
    };
  };

  const getInterpretation = (paramId: string, status: string, species: 'dog' | 'cat', age: number): string => {
    const interpretations: { [key: string]: { [key: string]: string } } = {
      rbc: {
        low: 'Anemia - zmniejszona liczba erytrocytów wskazuje na niedokrwistość. Może być wynikiem niedoborów żywieniowych, chorób przewlekłych, krwawień lub zaburzeń szpiku kostnego.',
        high: 'Politemia - zwiększona liczba erytrocytów może wskazywać na odwodnienie, choroby serca lub płuc, lub rzadziej na nowotwory krwiotwórcze.'
      },
      hgb: {
        low: 'Niedokrwistość - zmniejszona hemoglobina potwierdza anemię. Wymaga dalszej diagnostyki w celu ustalenia przyczyny.',
        high: 'Politemia - zwiększona hemoglobina może być związana z odwodnieniem lub chorobami układu oddechowego.'
      },
      wbc: {
        low: 'Leukopenia - zmniejszona liczba leukocytów może wskazywać na infekcje wirusowe, choroby autoimmunologiczne lub skutki leczenia cytostatycznego.',
        high: 'Leukocytoza - zwiększona liczba leukocytów może wskazywać na stan zapalny, infekcję bakteryjną, stres lub nowotwór.'
      },
      plt: {
        low: 'Trombocytopenia - zmniejszona liczba trombocytów zwiększa ryzyko krwawień. Może być wynikiem chorób autoimmunologicznych, infekcji lub toksyn.',
        high: 'Trombocytoza - zwiększona liczba trombocytów może być reakcją na stres, zapalenie lub choroby szpiku.'
      },
      alt: {
        low: 'Zazwyczaj bez znaczenia klinicznego.',
        high: 'Wzrost ALT wskazuje na uszkodzenie hepatocytów (komórek wątroby). Może być spowodowany hepatopatią, toksynami, lekami lub nowotworami wątroby.'
      },
      ast: {
        low: 'Zazwyczaj bez znaczenia klinicznego.',
        high: 'Wzrost AST może wskazywać na uszkodzenie wątroby lub mięśni. Wymaga korelacji z ALT.'
      },
      alp: {
        low: 'Hipofosfatazja - rzadka, może wskazywać na niedobór cynku lub choroby kości.',
        high: 'Wzrost ALP może być fizjologiczny u młodych zwierząt, lub patologiczny (choroby wątroby, kości, leki).'
      },
      bun: {
        low: 'Hipoazotemia - może wskazywać na niewłaściwą dietę, choroby wątroby lub dializę.',
        high: 'Hiperazotemia - zwiększony mocznik może wskazywać na niewydolność nerek, odwodnienie lub wysokobiałkową dietę.'
      },
      creatinine: {
        low: 'Zazwyczaj bez znaczenia klinicznego.',
        high: 'Wzrost kreatyniny jest markerem niewydolności nerek. Wymaga natychmiastowej uwagi weterynarza.'
      },
      glucose: {
        low: 'Hipoglikemia - niski poziom glukozy jest stanem zagrożenia życia. Wymaga natychmiastowej interwencji.',
        high: 'Hiperglikemia - może wskazywać na cukrzycę, stres lub zapalenie trzustki.'
      },
      cholesterol: {
        low: 'Hipocholesterolemia - może wskazywać na niedożywienie, choroby wątroby lub malabsorpcję.',
        high: 'Hipercholesterolemia - może być związana z dietą, chorobami tarczycy, nerek lub cukrzycą.'
      },
      sodium: {
        low: 'Hiponatremia - niski poziom sodu może prowadzić do zaburzeń neurologicznych. Wymaga korekty.',
        high: 'Hipernatremia - wysoki poziom sodu może wskazywać na odwodnienie.'
      },
      potassium: {
        low: 'Hipokaliemia - niski poziom potasu może powodować osłabienie mięśni i zaburzenia rytmu serca.',
        high: 'Hiperkaliemia - wysoki poziom potasu jest stanem zagrożenia życia, może powodować zatrzymanie serca.'
      },
      calcium: {
        low: 'Hipokalcemia - niski poziom wapnia może powodować drgawki i zaburzenia serca.',
        high: 'Hiperkalcemia - wysoki poziom wapnia może wskazywać na nowotwór, hiperparatroidyzm lub niewydolność nerek.'
      },
      phosphorus: {
        low: 'Hipofosfatemia - może wskazywać na niedożywienie lub choroby wątroby.',
        high: 'Hiperfosfatemia - często związana z niewydolnością nerek.'
      }
    };

    return interpretations[paramId]?.[status] || 'Wartość w normie.';
  };

  const getPossibleCauses = (paramId: string, status: string, species: 'dog' | 'cat'): string[] => {
    const causes: { [key: string]: { [key: string]: string[] } } = {
      rbc: {
        low: ['Niedobór żelaza', 'Choroby przewlekłe', 'Krwawienia', 'Choroby szpiku kostnego', 'Niedobór witaminy B12'],
        high: ['Odwodnienie', 'Choroby serca', 'Choroby płuc', 'Nowotwory krwiotwórcze']
      },
      wbc: {
        low: ['Infekcje wirusowe', 'Choroby autoimmunologiczne', 'Leczenie cytostatyczne', 'Choroby szpiku'],
        high: ['Infekcja bakteryjna', 'Stan zapalny', 'Stres', 'Nowotwór', 'Reakcja na leki']
      },
      alt: {
        high: ['Hepatopatia', 'Toksyny', 'Leki (np. sterydy)', 'Nowotwór wątroby', 'Choroby metaboliczne']
      },
      bun: {
        high: ['Niewydolność nerek', 'Odwodnienie', 'Wysokobiałkowa dieta', 'Krwawienie z przewodu pokarmowego']
      },
      creatinine: {
        high: ['Niewydolność nerek', 'Odwodnienie', 'Blokada moczowodów', 'Choroby serca']
      },
      glucose: {
        low: ['Cukrzyca insulinowa', 'Niedożywienie', 'Sepsa', 'Choroby wątroby', 'Insulinoma'],
        high: ['Cukrzyca', 'Stres', 'Zapalenie trzustki', 'Leki sterydowe']
      },
      cholesterol: {
        low: ['Niedożywienie', 'Choroby wątroby', 'Malabsorpcja', 'Choroby tarczycy'],
        high: ['Dieta wysokotłuszczowa', 'Choroby tarczycy', 'Niewydolność nerek', 'Cukrzyca']
      }
    };

    return causes[paramId]?.[status] || [];
  };

  const getDietaryRecommendations = (paramId: string, status: string, species: 'dog' | 'cat'): string[] => {
    const recommendations: { [key: string]: { [key: string]: string[] } } = {
      rbc: {
        low: ['Zwiększ podaż żelaza w diecie', 'Dodaj witaminę B12 i kwas foliowy', 'Rozważ dietę wysokobiałkową', 'Unikaj żywności zawierającej inhibitory żelaza']
      },
      alt: {
        high: ['Dieta niskotłuszczowa', 'Unikaj toksyn (np. cebula, czekolada)', 'Witamina E i sylimaryna jako wsparcie wątroby', 'Białko wysokiej jakości']
      },
      bun: {
        high: ['Ogranicz białko w diecie', 'Dieta niskofosforanowa', 'Zwiększ podaż wody', 'Unikaj produktów o wysokiej zawartości puryn']
      },
      creatinine: {
        high: ['Dieta niskobiałkowa dla nerek', 'Ogranicz fosfor', 'Kwasy tłuszczowe omega-3', 'Witamina B kompleks']
      },
      glucose: {
        high: ['Dieta niskowęglowodanowa', 'Wysokie białko i umiarkowane tłuszcze', 'Unikaj prostych cukrów', 'Regularne posiłki']
      },
      cholesterol: {
        high: ['Dieta niskotłuszczowa', 'Zwiększ błonnik', 'Kwasy tłuszczowe omega-3', 'Unikaj tłuszczów nasyconych']
      },
      sodium: {
        high: ['Dieta niskosodowa', 'Unikaj przetworzonej żywności', 'Świeże składniki', 'Ogranicz sól']
      },
      phosphorus: {
        high: ['Dieta niskofosforanowa', 'Unikaj kości i produktów bogatych w fosfor', 'Witamina D w kontrolowanych dawkach']
      }
    };

    return recommendations[paramId]?.[status] || [];
  };

  const getUrgency = (paramId: string, status: string, deviation: number): 'low' | 'medium' | 'high' => {
    const highUrgencyParams = ['creatinine', 'glucose', 'potassium', 'calcium', 'sodium'];
    const mediumUrgencyParams = ['rbc', 'wbc', 'plt', 'alt', 'bun'];

    if (highUrgencyParams.includes(paramId) && status !== 'normal') {
      return deviation > 50 ? 'high' : 'medium';
    }
    if (mediumUrgencyParams.includes(paramId) && status !== 'normal') {
      return deviation > 30 ? 'medium' : 'low';
    }
    return 'low';
  };

  const handleAnalyze = () => {
    const results = parameters
      .filter(p => p.value > 0)
      .map(p => analyzeParameter(p));
    
    setAnalysisResults(results);
    setShowResults(true);
    setShowForm(false);
  };

  const handleReset = () => {
    setShowForm(true);
    setShowResults(false);
    setAnalysisResults([]);
    setParameters(params => params.map(p => ({ ...p, value: 0 })));
  };

  const handleSave = () => {
    const savedAnalyses = JSON.parse(localStorage.getItem('bloodAnalyses') || '[]');
    const newAnalysis = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      petId: selectedPet,
      species: petSpecies,
      age: petAge,
      parameters: parameters.filter(p => p.value > 0),
      results: analysisResults
    };
    savedAnalyses.push(newAnalysis);
    localStorage.setItem('bloodAnalyses', JSON.stringify(savedAnalyses));
    alert('Analiza zapisana pomyślnie');
  };

  const handleParameterChange = (id: string, value: string) => {
    setParameters(params => 
      params.map(p => 
        p.id === id ? { ...p, value: parseFloat(value) || 0 } : p
      )
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        processImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setOcrStatus('Inicjalizacja OCR...');
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(
        imageData,
        'pol+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
              setOcrStatus('Rozpoznawanie tekstu...');
            }
          }
        }
      );

      setOcrStatus('Przetwarzanie wyników...');
      const extractedText = result.data.text;
      parseAndFillValues(extractedText);
      
      setOcrStatus('Zakończono');
      setTimeout(() => {
        setIsProcessing(false);
        setOcrProgress(0);
        setOcrStatus('');
      }, 1000);
    } catch (error) {
      console.error('OCR Error:', error);
      setOcrStatus('Błąd OCR');
      setIsProcessing(false);
      alert('Nie udało się przetworzyć obrazu. Spróbuj ponownie lub wprowadź wartości ręcznie.');
    }
  };

  const parseAndFillValues = (text: string) => {
    const lines = text.split('\n');
    const lowerText = text.toLowerCase();
    
    // Polish and English parameter name patterns
    const patterns: { [key: string]: string[] } = {
      rbc: ['rbc', 'erytrocyt', 'red blood'],
      hgb: ['hgb', 'hemoglobina', 'hemoglobin', 'hb'],
      hct: ['hct', 'hematokryt', 'hematocrit', 'ht'],
      mcv: ['mcv'],
      mch: ['mch'],
      mchc: ['mchc'],
      wbc: ['wbc', 'leukocyt', 'white blood'],
      plt: ['plt', 'trombocyt', 'platelet'],
      alt: ['alt', 'sgpt', 'alat'],
      ast: ['ast', 'sgot', 'asat'],
      alp: ['alp', 'fosfataza'],
      ggt: ['ggt'],
      tbil: ['bilirubina', 'bilirubin', 'tbil'],
      albumin: ['albumina', 'albumin', 'alb'],
      globulin: ['globulina', 'globulin', 'glob'],
      tp: ['bialko', 'protein', 'tp'],
      bun: ['mocznik', 'urea', 'bun'],
      creatinine: ['kreatynina', 'creatinine', 'cre', 'krea'],
      glucose: ['glukoza', 'glucose', 'glu', 'cukier'],
      cholesterol: ['cholesterol', 'cholesterol', 'chol'],
      sodium: ['sod', 'sodium', 'na'],
      potassium: ['potas', 'potassium', 'k'],
      chloride: ['chlork', 'chloride', 'cl'],
      calcium: ['wapn', 'calcium', 'ca'],
      phosphorus: ['fosfor', 'phosphorus', 'phos'],
    };

    const updatedParameters = [...parameters];

    // Try to find values for each parameter
    Object.keys(patterns).forEach(paramId => {
      const paramPatterns = patterns[paramId];
      
      for (const pattern of paramPatterns) {
        const regex = new RegExp(pattern, 'i');
        const matchIndex = lines.findIndex(line => regex.test(line));
        
        if (matchIndex !== -1) {
          // Found the parameter line, now extract the value
          const line = lines[matchIndex];
          const valueMatch = line.match(/[\d.,]+/g);
          
          if (valueMatch && valueMatch.length > 0) {
            // Get the last number (usually the value)
            let valueStr = valueMatch[valueMatch.length - 1].replace(',', '.');
            const value = parseFloat(valueStr);
            
            if (!isNaN(value) && value > 0) {
              const paramIndex = updatedParameters.findIndex(p => p.id === paramId);
              if (paramIndex !== -1) {
                updatedParameters[paramIndex] = { ...updatedParameters[paramIndex], value };
                break; // Found and set, move to next parameter
              }
            }
          }
          
          // Also check next line for value
          if (matchIndex + 1 < lines.length) {
            const nextLine = lines[matchIndex + 1];
            const nextValueMatch = nextLine.match(/[\d.,]+/g);
            
            if (nextValueMatch && nextValueMatch.length > 0) {
              let valueStr = nextValueMatch[0].replace(',', '.');
              const value = parseFloat(valueStr);
              
              if (!isNaN(value) && value > 0) {
                const paramIndex = updatedParameters.findIndex(p => p.id === paramId);
                if (paramIndex !== -1) {
                  updatedParameters[paramIndex] = { ...updatedParameters[paramIndex], value };
                  break;
                }
              }
            }
          }
        }
      }
    });

    setParameters(updatedParameters);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'Wysoki priorytet';
      case 'medium': return 'Średni priorytet';
      case 'low': return 'Niski priorytet';
      default: return 'Brak danych';
    }
  };

  const groupedParameters = {
    morphology: parameters.filter(p => p.category === 'morphology'),
    biochemistry: parameters.filter(p => p.category === 'biochemistry'),
    electrolytes: parameters.filter(p => p.category === 'electrolytes')
  };

  const categoryNames = {
    morphology: 'Morfologia krwi',
    biochemistry: 'Biochemia',
    electrolytes: 'Elektrolity'
  };

  return (
    <div className="space-y-6">
      {/* Pet Selection */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Wybierz zwierzę</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {pets.map((pet) => (
            <button
              key={pet.id}
              onClick={() => {
                setSelectedPet(pet.id);
                setPetSpecies(pet.species);
                setPetAge(pet.age);
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedPet === pet.id
                  ? 'border-brand-dark bg-brand-dark/5'
                  : 'border-gray-200 hover:border-brand-dark/30'
              }`}
            >
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-brand-dark/10 flex items-center justify-center">
                  <PawPrint className="w-5 h-5 text-brand-dark" />
                </div>
                <div className="text-sm font-medium text-gray-700">{pet.name}</div>
                <div className="text-xs text-gray-500">{pet.species === 'dog' ? 'Pies' : 'Kot'}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Gatunek</label>
            <select
              value={petSpecies}
              onChange={(e) => setPetSpecies(e.target.value as 'dog' | 'cat')}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
            >
              <option value="dog">Pies</option>
              <option value="cat">Kot</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Wiek (lata)</label>
            <input
              type="number"
              value={petAge}
              onChange={(e) => setPetAge(parseFloat(e.target.value) || 1)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
              min="0"
              max="30"
              step="0.5"
            />
          </div>
        </div>
      </div>

      {showForm && (
        <>
          {/* Blood Test Input Form */}
          <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Droplets className="w-5 h-5 text-brand-dark" />
                <h3 className="text-lg font-semibold text-gray-900">Wprowadź wyniki badań</h3>
              </div>
              <div className="text-sm text-gray-500">
                Wartości referencyjne dla {petSpecies === 'dog' ? 'psów' : 'kotów'}
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Camera className="w-5 h-5 text-brand-dark" />
                <h4 className="text-md font-semibold text-gray-800">Skanuj wyniki badań</h4>
              </div>
              
              {!uploadedImage ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-brand-dark/50 transition-all">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-brand-dark/10 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-brand-dark" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Kliknij aby przesłać zdjęcie</div>
                      <div className="text-sm text-gray-500 mt-1">lub przeciągnij i upuść plik</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      Obsługiwane formaty: JPG, PNG, PDF
                    </div>
                  </label>
                </div>
              ) : (
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Uploaded blood test"
                      className="w-full max-h-64 object-contain bg-gray-50"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  
                  {isProcessing && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-brand-dark animate-spin" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">{ocrStatus}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-brand-dark h-2 rounded-full transition-all duration-300"
                              style={{ width: `${ocrProgress}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-medium text-brand-dark">{ocrProgress}%</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-500">lub wprowadź ręcznie</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {Object.entries(groupedParameters).map(([category, params]) => (
              <div key={category} className="mb-6">
                <h4 className="text-md font-semibold text-gray-800 mb-3">{categoryNames[category as keyof typeof categoryNames]}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {params.map((param) => {
                    const min = petSpecies === 'dog' ? param.dogMin : param.catMin;
                    const max = petSpecies === 'dog' ? param.dogMax : param.catMax;
                    return (
                      <div key={param.id} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          {param.namePl} ({param.name})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={param.value || ''}
                            onChange={(e) => handleParameterChange(param.id, e.target.value)}
                            placeholder="0"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-dark/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            {param.unit}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Norma: {min} - {max} {param.unit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAnalyze}
                disabled={parameters.filter(p => p.value > 0).length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-dark text-white font-semibold hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calculator className="w-5 h-5" />
                Analizuj wyniki
              </button>
            </div>
          </div>
        </>
      )}

      {showResults && (
        <>
          {/* Analysis Results */}
          <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-brand-dark" />
                <h3 className="text-lg font-semibold text-gray-900">Wyniki analizy</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Zapisz
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  Nowa analiza
                </button>
              </div>
            </div>

            {analysisResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Brak wyników do analizy</p>
                <p className="text-sm mt-1">Wprowadź co najmniej jeden parametr</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analysisResults.map((result, index) => (
                  result.status !== 'normal' && (
                    <div key={index} className={`p-4 rounded-xl border-2 ${getUrgencyColor(result.urgency)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {result.status === 'low' ? (
                            <TrendingDown className="w-5 h-5" />
                          ) : result.status === 'high' ? (
                            <TrendingUp className="w-5 h-5" />
                          ) : (
                            <Minus className="w-5 h-5" />
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">{result.parameter}</div>
                            <div className="text-sm text-gray-600">
                              {result.status === 'low' ? 'Wartość niska' : result.status === 'high' ? 'Wartość wysoka' : 'W normie'}
                              {result.deviation > 0 && ` (${result.deviation.toFixed(1)}% odchylenia)`}
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${getUrgencyColor(result.urgency)}`}>
                          {getUrgencyLabel(result.urgency)}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Interpretacja kliniczna</div>
                          <p className="text-sm text-gray-600">{result.interpretation}</p>
                        </div>

                        {result.possibleCauses.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Możliwe przyczyny</div>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              {result.possibleCauses.map((cause, i) => (
                                <li key={i}>{cause}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {result.dietaryRecommendations.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Zalecenia dietetyczne</div>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              {result.dietaryRecommendations.map((rec, i) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))}

                {analysisResults.filter(r => r.status === 'normal').length > 0 && (
                  <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div className="font-semibold text-green-900">Parametry w normie</div>
                    </div>
                    <div className="text-sm text-green-700">
                      {analysisResults.filter(r => r.status === 'normal').map(r => r.parameter).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-4 sm:p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Podsumowanie</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{analysisResults.filter(r => r.status === 'normal').length}</div>
                <div className="text-sm opacity-80">W normie</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{analysisResults.filter(r => r.status !== 'normal').length}</div>
                <div className="text-sm opacity-80">Odchylenia</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{analysisResults.filter(r => r.urgency === 'high').length}</div>
                <div className="text-sm opacity-80">Wysoki priorytet</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <p className="text-sm opacity-90">
                <strong>Ważne:</strong> Ta analiza ma charakter informacyjny i nie zastępuje profesjonalnej konsultacji weterynaryjnej. 
                W przypadku niepokojących wyników skonsultuj się z lekarzem weterynarii.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
