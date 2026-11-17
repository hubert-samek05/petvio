const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');
const { getActiveSportDietForPet, checkKeywordOverlap, keywordItemMatches } = require('../utils/sport-diet.utils');

const INGREDIENT_RULES = [
  // Mięsa i ryby
  { match: ['chicken', 'kurczak', 'chicken meat', 'kurczak suszony', 'mięso z kurczaka'], dog: 'good', cat: 'good', desc: 'Łatwo strawne źródło białka' },
  { match: ['turkey', 'indyk', 'mięso z indyka'], dog: 'good', cat: 'good', desc: 'Lekkie źródło białka, zazwyczaj dobrze tolerowane' },
  { match: ['duck', 'kaczka', 'mięso z kaczki'], dog: 'good', cat: 'good', desc: 'Dobre źródło białka, często hipoalergiczne' },
  { match: ['beef', 'wołowina', 'wołowin', 'mięso wołowe'], dog: 'good', cat: 'good', desc: 'Cenne źródło białka i żelaza' },
  { match: ['lamb', 'jagnięcina', 'jagnięcin', 'mięso jagnięce'], dog: 'good', cat: 'good', desc: 'Dobre źródło białka, mało alergenne' },
  { match: ['rabbit', 'królik', 'mięso z królika'], dog: 'good', cat: 'good', desc: 'Nietypowe źródło białka, hipoalergiczne' },
  { match: ['salmon', 'łosoś', 'łososia', 'łososiowy'], dog: 'good', cat: 'good', desc: 'Źródło białka i cennych kwasów omega-3' },
  { match: ['tuna', 'tuńczyk', 'tuńczyka'], dog: 'caution', cat: 'caution', desc: 'Tłuste ryby – podawać z umiarem (rtęć, zależność u kotów)' },
  { match: ['fish', 'ryba', 'ryby', 'fish meal'], dog: 'good', cat: 'good', desc: 'Źródło białka i kwasów omega-3' },
  { match: ['herring', 'śledź', 'śledzia'], dog: 'good', cat: 'good', desc: 'Cenne źródło kwasów omega-3' },
  { match: ['egg', 'jajko', 'jajka', 'eggs', 'jajeczny'], dog: 'good', cat: 'good', desc: 'Pełnowartościowe białko' },
  { match: ['raw eggs', 'surowe jajka'], dog: 'avoid', cat: 'avoid', desc: 'Surowe jajka mogą zawierać salmonellę i niszczyc biotynę' },
  { match: ['raw meat', 'surowe mięso'], dog: 'caution', cat: 'caution', desc: 'Ryzyko zakażenia bakteryjnego i pasożytniczego' },
  { match: ['raw fish', 'surowa ryba'], dog: 'avoid', cat: 'avoid', desc: 'Surowa ryba może zawierać tasiemce i niszczyc tiaminę' },

  // Tłuszcze i oleje
  { match: ['fish oil', 'olej rybny', 'łososiowy'], dog: 'good', cat: 'good', desc: 'Wspiera skórę, sierść i stawy' },
  { match: ['salmon oil', 'olej z łososia'], dog: 'good', cat: 'good', desc: 'Źródło kwasów omega-3' },
  { match: ['olive oil', 'oliwa z oliwek', 'olej oliwkowy'], dog: 'good', cat: 'good', desc: 'Zdrowy tłuszcz roślinny' },
  { match: ['coconut oil', 'olej kokosowy'], dog: 'good', cat: 'caution', desc: 'Tłuszcz MCT – u kotów podawać z umiarem' },
  { match: ['animal fat', 'tłuszcz zwierzęcy'], dog: 'caution', cat: 'caution', desc: 'Dostarcza energii, ale źródło często nieujawnione' },
  { match: ['fat trimmings', 'skwarki', 'obrzeżki tłuszczu'], dog: 'avoid', cat: 'avoid', desc: 'Trudno strawne, mogą powodować zapalenie trzustki' },

  // Warzywa, owoce, zboża, rośliny
  { match: ['carrot', 'carrots', 'marchew', 'marchewka', 'marchewki'], dog: 'good', cat: 'good', desc: 'Źródło błonnika i beta-karotenu' },
  { match: ['pumpkin', 'dynia', 'dyni'], dog: 'good', cat: 'good', desc: 'Wspiera trawienie, łagodzi problemy żołądkowe' },
  { match: ['sweet potato', 'batat', 'bataty'], dog: 'good', cat: 'caution', desc: 'Węglowodany – dla kotów podawać z umiarem' },
  { match: ['potato', 'potatoes', 'ziemniak', 'ziemniaki'], dog: 'good', cat: 'caution', desc: 'Zielone ziemniaki są toksyczne; wartość odżywcza dla kota niska' },
  { match: ['green potato', 'zielony ziemniak'], dog: 'avoid', cat: 'avoid', desc: 'Zawiera toksyczny solanin' },
  { match: ['peas', 'pea', 'groszek', 'groch'], dog: 'good', cat: 'caution', desc: 'Błonnik i białko roślinne; koty trawią gorzej' },
  { match: ['apple', 'apples', 'jabłko', 'jabłka'], dog: 'good', cat: 'caution', desc: 'Dobre dla psów, z pestkami usuniętymi; koty – z umiarem' },
  { match: ['blueberry', 'blueberries', 'borówka', 'borówki', 'jagoda', 'jagody'], dog: 'good', cat: 'caution', desc: 'Antyoksydanty, dla kota z umiarem' },
  { match: ['cranberry', 'cranberries', 'żurawina', 'żurawiny'], dog: 'good', cat: 'caution', desc: 'Wspiera drogi moczowe, z umiarem' },
  { match: ['spinach', 'szpinak'], dog: 'good', cat: 'caution', desc: 'Dla kota duże ilości mogą szkodzić' },
  { match: ['broccoli', 'brokuł', 'brokuły'], dog: 'good', cat: 'caution', desc: 'Zdrowe, ale może powodować wzdęcia' },
  { match: ['rice', 'ryż', 'ryżu', 'ryżowy'], dog: 'good', cat: 'caution', desc: 'Dobry dodatek dla psa, koty nie potrzebują zbóż' },
  { match: ['brown rice', 'ryż brązowy'], dog: 'good', cat: 'caution', desc: 'Pełne ziarno, z umiarem dla kota' },
  { match: ['oats', 'oatmeal', 'owies', 'owsianka'], dog: 'good', cat: 'caution', desc: 'Zdrowe zboże dla psa, z umiarem dla kota' },
  { match: ['wheat', 'pszenica', 'pszenicy', 'gluten', 'pszenny'], dog: 'caution', cat: 'caution', desc: 'Częsty alergen i zbędny wypełniacz' },
  { match: ['corn', 'kukurydza', 'kukurydzy', 'kukurydziany'], dog: 'caution', cat: 'caution', desc: 'Tani wypełniacz, trudny do strawienia dla wielu zwierząt' },
  { match: ['soy lecithin', 'lecithin', 'lecytyna', 'lecytyny'], dog: 'good', cat: 'good', desc: 'Emulgator, zazwyczaj bezpieczny' },
  { match: ['soy', 'soja', 'soi', 'sojowy'], dog: 'caution', cat: 'caution', desc: 'Może zaburzać trawienie i być alergenem' },
  { match: ['white flour', 'mąka pszenna', 'mąka'], dog: 'caution', cat: 'caution', desc: 'Wysoko przetworzony wypełniacz' },
  { match: ['lentil', 'lentils', 'soczewica', 'soczewicy'], dog: 'good', cat: 'caution', desc: 'Białko roślinne, dla kota z umiarem' },
  { match: ['chickpea', 'chickpeas', 'ciecierzyca', 'ciecierzycy'], dog: 'good', cat: 'caution', desc: 'Roślinne białko, z umiarem dla kota' },
  { match: ['flaxseed', 'flaxseeds', 'siemię lniane', 'lniany'], dog: 'good', cat: 'good', desc: 'Źródło błonnika i kwasów omega-3' },
  { match: ['chia', 'nasiona chia'], dog: 'good', cat: 'caution', desc: 'Błonnik i kwasy omega-3, z umiarem' },
  { match: ['coconut', 'kokos', 'wiórki kokosowe'], dog: 'caution', cat: 'caution', desc: 'Tłuszcz roślinny, z umiarem' },
  { match: ['peanut butter', 'masło orzechowe'], dog: 'caution', cat: 'caution', desc: 'Dobry smakołyk, ale sprawdź czy bez ksylitolu i soli' },
  { match: ['avocado', 'awokado', 'persin'], dog: 'avoid', cat: 'avoid', desc: 'Persyna może być toksyczna' },
  { match: ['grapes', 'grape', 'winogron', 'winogrono'], dog: 'avoid', cat: 'avoid', desc: 'Nawet małe ilości mogą uszkodzić nerki' },
  { match: ['raisins', 'rodzynki', 'rodzynek'], dog: 'avoid', cat: 'avoid', desc: 'Toksyczne, podobnie jak winogrona' },
  { match: ['currants', 'porzeczki'], dog: 'avoid', cat: 'avoid', desc: 'Potencjalnie toksyczne' },
  { match: ['macadamia', 'orzechy makadamia', 'makadamia'], dog: 'avoid', cat: 'avoid', desc: 'Toksyczne dla psów; dla kotów niezalecane' },
  { match: ['tomato', 'tomatoes', 'pomidor', 'pomidory'], dog: 'caution', cat: 'caution', desc: 'Dojrzały owoc zazwyczaj bezpieczny, ale liście i łodygi toksyczne' },
  { match: ['tomato leaves', 'liście pomidora', 'tomato plant'], dog: 'avoid', cat: 'avoid', desc: 'Zawierają toksyczny solanin' },
  { match: ['rhubarb', 'rabarbar'], dog: 'avoid', cat: 'avoid', desc: 'Liście i korzenie są toksyczne' },
  { match: ['mushrooms', 'grzyby', 'pieczarki', 'mushroom'], dog: 'avoid', cat: 'avoid', desc: 'Dzikie grzyby mogą być trujące; uprawiane z umiarem' },
  { match: ['garlic', 'czosnek'], dog: 'avoid', cat: 'avoid', desc: 'Niszczy czerwone krwinki, nawet w małych ilościach' },
  { match: ['onion', 'onions', 'cebula', 'cebuli', 'cebulo'], dog: 'avoid', cat: 'avoid', desc: 'Toksyczna, może wywołać anemię' },
  { match: ['leek', 'leeks', 'por', 'pory'], dog: 'avoid', cat: 'avoid', desc: 'Podobnie jak cebula – toksyczny' },
  { match: ['shallot', 'shallots', 'szalotka'], dog: 'avoid', cat: 'avoid', desc: 'Toksyczna dla zwierząt' },
  { match: ['chives', 'szczypiorek'], dog: 'avoid', cat: 'avoid', desc: 'Toksyczny, nawet w małych ilościach' },
  { match: ['scallions', 'dymka'], dog: 'avoid', cat: 'avoid', desc: 'Toksyczny, podobnie jak cebula' },

  // Nabiał
  { match: ['milk', 'mleko', 'mleczny'], dog: 'caution', cat: 'caution', desc: 'Wiele dorosłych zwierząt nie trawi laktozy' },
  { match: ['lactose', 'laktoza'], dog: 'caution', cat: 'caution', desc: 'Cukier mleczny, często źle tolerowany' },
  { match: ['cheese', 'ser', 'serek', 'sery'], dog: 'caution', cat: 'caution', desc: 'Tłusty, z dużą ilością soli; z umiarem' },
  { match: ['cottage cheese', 'twaróg', 'serek wiejski'], dog: 'good', cat: 'caution', desc: 'Niskotłuszczowy produkt dla psa, z umiarem dla kota' },
  { match: ['yogurt', 'jogurt', 'jogurtu'], dog: 'caution', cat: 'caution', desc: 'Naturalny bez cukru i ksylitolu – z umiarem' },

  // Słodziki, przyprawy, inne
  { match: ['sugar', 'cukier', 'cukru', 'cukrowy', 'cukrem', 'cukry'], dog: 'caution', cat: 'caution', desc: 'Pusty węglowodan, sprzyja otyłości i próchnicy' },
  { match: ['xylitol', 'ksylitol', 'birch sugar', 'cukier brzozowy'], dog: 'avoid', cat: 'avoid', desc: 'Bardzo toksyczny – może wywołać niedocukrzenie i niewydolność wątroby' },
  { match: ['salt', 'sól', 'sodium', 'sod', 'chlorek sodu'], dog: 'caution', cat: 'caution', desc: 'Duże ilości są szkodliwe dla nerek i serca' },
  { match: ['chocolate', 'czekolada', 'cocoa', 'kakao', 'theobromine', 'teobromina'], dog: 'avoid', cat: 'avoid', desc: 'Zawiera toksyczną teobrominę i kofeinę' },
  { match: ['caffeine', 'kofeina', 'coffee', 'kawa', 'tea', 'herbata'], dog: 'avoid', cat: 'avoid', desc: 'Stymulant, toksyczny dla zwierząt' },
  { match: ['alcohol', 'alkohol', 'ethanol'], dog: 'avoid', cat: 'avoid', desc: 'Toksyczny, nawet niewielkie ilości są niebezpieczne' },
  { match: ['nutmeg', 'gałka muszkatołowa'], dog: 'avoid', cat: 'avoid', desc: 'Może być trująca dla zwierząt' },
  { match: ['hops', 'chmiel'], dog: 'avoid', cat: 'avoid', desc: 'Toksyczny, szczególnie dla psów' },
  { match: ['marijuana', 'cannabis', 'marihuana', 'thc'], dog: 'avoid', cat: 'avoid', desc: 'Toksyczna, może zagrażać życiu' },
  { match: ['tobacco', 'nicotine', 'tytoń', 'nikotyna'], dog: 'avoid', cat: 'avoid', desc: 'Silnie toksyczna' },
  { match: ['yeast', 'drożdże', 'drożdżowy', 'raw dough', 'surowe ciasto'], dog: 'avoid', cat: 'avoid', desc: 'Surowe ciasto z drożdżami fermentuje w żołądku' },
  { match: ['moldy', 'pleśń', 'pleśniowy', 'spleśniały'], dog: 'avoid', cat: 'avoid', desc: 'Może zawierać toksyny' },
  { match: ['cooked bones', 'ugotowane kości', 'bone', 'kości', 'kość'], dog: 'avoid', cat: 'avoid', desc: 'Ugotowane kości mogą się kruszyć i zranić przewód pokarmowy' },

  // Dodatki i konserwanty
  { match: ['preservative', 'konserwant', 'konservant', 'preservatives', 'konserwanty'], dog: 'caution', cat: 'caution', desc: 'Sztuczne konserwanty są niepożądane' },
  { match: ['bha', 'bht', 'ethoxyquin', 'ethoxyquine'], dog: 'avoid', cat: 'avoid', desc: 'Sztuczne przeciwutleniacze o wątpliwej bezpieczeństwie' },
  { match: ['artificial color', 'artificial colors', 'barwnik', 'barwniki'], dog: 'avoid', cat: 'avoid', desc: 'Sztuczne barwniki nie są potrzebne i mogą uczulać' },
  { match: ['artificial flavor', 'artificial flavours', 'aromat', 'aromaty'], dog: 'avoid', cat: 'avoid', desc: 'Sztuczne aromaty nie są pożądane' },
  { match: ['propylene glycol', 'glikol propylenowy'], dog: 'avoid', cat: 'avoid', desc: 'Stosowany w karmie, ale kontrowersyjny' },
  { match: ['carrageenan', 'karagen', 'karaginan'], dog: 'avoid', cat: 'avoid', desc: 'Środek zagęszczający, potencjalnie zapalny dla jelit' },
  { match: ['by-products', 'subproducts', 'product', 'odrzu', 'wątroba', 'serca', 'nerki', ' żołądek', 'podroby'], dog: 'caution', cat: 'caution', desc: 'Niejednoznaczne źródło białka, jakość zależy od producenta' },
  { match: ['animal by-products', 'produkty uboczne pochodzenia zwierzęcego', 'animal derivatives'], dog: 'caution', cat: 'caution', desc: 'Niskiej jakości źródło białka, mało transparentne' },
  { match: ['meat meal', 'meat and bone meal', 'mięso mielone', 'mączka mięsna'], dog: 'caution', cat: 'caution', desc: 'Skoncentrowane białko, ale jakość silnie zróżnicowana' },
  { match: ['rendered fat', 'stopione tłuszcze', 'tłuszcz przetworzony'], dog: 'caution', cat: 'caution', desc: 'Tłuszcz o nieznanym pochodzeniu' },
  { match: ['fillers', 'wypełniacz', 'wypełniacze'], dog: 'caution', cat: 'caution', desc: 'Zwiększają objętość, bez wartości odżywczej' },
  { match: ['palm', 'palm oil', 'olej palmowy'], dog: 'caution', cat: 'caution', desc: 'Tłuszcz nasycony, często nieetyczny' },
  { match: ['rapeseed', 'canola', 'olej rzepakowy', 'rzepak'], dog: 'caution', cat: 'caution', desc: 'Tłuszcz roślinny, z umiarem' },
  { match: ['sunflower', 'sunflower oil', 'olej słonecznikowy'], dog: 'caution', cat: 'caution', desc: 'Tłuszcz roślinny, z umiarem' },
  { match: ['emulsifier', 'emulgator', 'emulgatory'], dog: 'caution', cat: 'caution', desc: 'Dodatek technologiczny, z umiarem' },
  { match: ['glucose syrup', 'syrup', 'syrop glukozowy', 'glukoza'], dog: 'caution', cat: 'caution', desc: 'Cukier, pusty węglowodan' },
  { match: ['dextrose', 'maltodextrin', 'maltodextryna'], dog: 'caution', cat: 'caution', desc: 'Szybko wchłaniany węglowodan' },
  { match: ['fructose', 'fruktoza'], dog: 'caution', cat: 'caution', desc: 'Cukier owocowy, z umiarem' },
  { match: ['corn syrup', 'high fructose corn syrup', 'syrop kukurydziany'], dog: 'avoid', cat: 'avoid', desc: 'Bardzo przetworzony cukier' },
  { match: ['molasses', 'melasa', 'słód', 'malt'], dog: 'caution', cat: 'caution', desc: 'Słodki dodatek, z umiarem' },
  { match: ['starch', 'amidon', 'skrobia', 'skrobiowy'], dog: 'caution', cat: 'caution', desc: 'Węglowodan, często wypełniacz' },
  { match: ['wheat starch', 'skrobia pszenna'], dog: 'caution', cat: 'caution', desc: 'Wypełniacz zbożowy' },
  { match: ['whey', 'serwatka', 'lactose', 'laktoza', 'lactoserum'], dog: 'caution', cat: 'caution', desc: 'Nabiał, często problematyczny' },
  { match: ['casein', 'kazeina'], dog: 'caution', cat: 'caution', desc: 'Białko mleczne' },
  { match: ['milk proteins', 'mleczne białko', 'białko mleczne'], dog: 'caution', cat: 'caution', desc: 'Białko mleczne, może uczulać' },
  { match: ['gluten', 'gluten'], dog: 'caution', cat: 'caution', desc: 'Białko zbożowe, często alergen' },
  { match: ['cocoa', 'cocoa powder', 'kakao', 'proszek kakaowy'], dog: 'avoid', cat: 'avoid', desc: 'Zawiera teobrominę' },
  { match: ['caramel', 'caramel color', 'karmel', 'barwnik karmelowy'], dog: 'caution', cat: 'caution', desc: 'Barwnik, nie wartościowy' },
  { match: ['flavor', 'flavors', 'flavour', 'flavours', 'flavoring', 'flavorings', 'aroma', 'aromat', 'aromaty', 'natural flavor', 'natural flavour'], dog: 'avoid', cat: 'avoid', desc: 'Sztuczne lub nieujawnione aromaty' },
  { match: ['carrageenan', 'carrageen', 'karagen', 'karaginan'], dog: 'avoid', cat: 'avoid', desc: 'Kontrowersyjny środek zagęszczający' },
  { match: ['phosphate', 'diphosphate', 'phosphates', 'fosforan', 'difosforan'], dog: 'caution', cat: 'caution', desc: 'Dodatek buforujący, z umiarem' },
  { match: ['bicarbonate', 'węglan', 'wodorowęglan'], dog: 'caution', cat: 'caution', desc: 'Środek spulchniający, z umiarem' },
  { match: ['raising agents', 'poudres à lever', 'proszki do pieczenia', 'proszek do pieczenia'], dog: 'caution', cat: 'caution', desc: 'Środki spulchniające' },
  { match: ['yeast extract', 'ekstrakt drożdżowy', 'autolyzed yeast'], dog: 'caution', cat: 'caution', desc: 'Wzmacniacz smaku, zawiera puryny' },
  { match: ['monosodium glutamate', 'msg', 'glutaminian sodu'], dog: 'avoid', cat: 'avoid', desc: 'Wzmacniacz smaku, może działać toksycznie' },
  { match: ['hydrolyzed', 'hydrolizowane', 'hydrolysate'], dog: 'caution', cat: 'caution', desc: 'Przetworzone białko, często niejawne źródło' },
  { match: ['sorbic acid', 'potassium sorbate', 'sorbinian', 'sorbate'], dog: 'caution', cat: 'caution', desc: 'Konserwant, z umiarem' },
  { match: ['benzoic acid', 'sodium benzoate', 'benzoesan'], dog: 'caution', cat: 'caution', desc: 'Konserwant chemiczny' },
  { match: ['propionic acid', 'calcium propionate', 'propionian'], dog: 'caution', cat: 'caution', desc: 'Konserwant pieczywa' },
  { match: ['sodium nitrite', 'sodium nitrate', 'nitrite', 'nitrate', 'azotyn', 'azotan'], dog: 'avoid', cat: 'avoid', desc: 'Konserwanty mięs, potencjalnie rakotwórcze' },
  { match: ['sulfur dioxide', 'sulfite', 'sulfites', 'dwutlenek siarki', 'siarczyn'], dog: 'avoid', cat: 'avoid', desc: 'Konserwant, może uczulać' },
  { match: ['aspartame', 'acesulfame', 'sucralose', 'saccharin', 'neotame', 'słodzik', 'słodziki'], dog: 'avoid', cat: 'avoid', desc: 'Sztuczny słodzik' },
  { match: ['sorbitol', 'mannitol', 'maltitol', 'xylitol', 'isomalt', 'lactitol', 'polyols', 'sugar alcohols', 'alkohole cukrowe'], dog: 'caution', cat: 'caution', desc: 'Alkohole cukrowe mogą powodować biegunkę' },
  { match: ['guar gum', 'xanthan gum', 'locust bean gum', 'guma guar', 'gumy', 'zagęstniki'], dog: 'caution', cat: 'caution', desc: 'Zagęstniki, z umiarem' },
  { match: ['honey', 'miód'], dog: 'caution', cat: 'caution', desc: 'Słodki, z umiarem' },
  { match: ['tapioca', 'cassava', 'manioc', 'tapioka', 'maniok'], dog: 'caution', cat: 'caution', desc: 'Węglowodan, z umiarem' },
  { match: ['barley', 'millet', 'quinoa', 'buckwheat', 'jęczmień', 'proso', 'komosa', 'gryka'], dog: 'good', cat: 'caution', desc: 'Zboże alternatywne, z umiarem dla kota' },
  { match: ['mango', 'pineapple', 'peach', 'plum', 'apricot', 'cherry', 'mango', 'ananas', 'brzoskwinia', 'śliwka', 'morela', 'wiśnia'], dog: 'good', cat: 'caution', desc: 'Owoce, z umiarem dla kota' },
  { match: ['coconut', 'kokos', 'wiórki kokosowe'], dog: 'caution', cat: 'caution', desc: 'Tłuszcz roślinny, z umiarem' },
  { match: ['sunflower seeds', 'pumpkin seeds', 'sesame seeds', 'nasiona słonecznika', 'pestki dyni', 'sezam'], dog: 'good', cat: 'caution', desc: 'Ziarna, z umiarem dla kota' },
  { match: ['walnuts', 'almonds', 'cashews', 'hazelnuts', 'pecans', 'brazil nuts', 'pistachios', 'chestnuts', 'pine nuts', 'orzechy', 'migdały', 'nerkowce', 'orzechy laskowe', 'pekan', 'orzechy brazylijskie', 'orzechy pistacjowe', 'kasztany', 'orzeszki piniowe'], dog: 'caution', cat: 'caution', desc: 'Orzechy są tłuste i kaloryczne' },
  { match: ['gelatin', 'collagen', 'żywica', 'kolagen', 'żelatyna'], dog: 'caution', cat: 'caution', desc: 'Źródło białka, z umiarem' },
  { match: ['bone meal', 'mączka kostna'], dog: 'caution', cat: 'caution', desc: 'Źródło wapnia, jakość zależna od producenta' },
  { match: ['chicken meal', 'turkey meal', 'fish meal', 'salmon meal', 'whitefish meal', 'whitefish', 'mączka z kurczaka', 'mączka z indyka', 'mączka rybna', 'mączka z łososia'], dog: 'caution', cat: 'caution', desc: 'Skoncentrowane białko, jakość zróżnicowana' },
  { match: ['duck meal', 'lamb meal', 'beef meal', 'pork meal', 'rabbit meal', 'venison meal', 'bison meal', 'goat meal', 'mączka z kaczki', 'mączka jagnięca', 'mączka wołowa', 'mączka wieprzowa', 'mączka z królika'], dog: 'caution', cat: 'caution', desc: 'Skoncentrowane białko, jakość zróżnicowana' },
  { match: ['kidney', 'liver', 'heart', 'lung', 'tripe', 'spleen', 'gizzard', 'brain', 'podroby', 'wątroba', 'serce', 'żołądek', 'śledziona', 'nerki', 'móżdżek'], dog: 'good', cat: 'good', desc: 'Wartościowe podroby, z umiarem' },
  { match: ['animal digest', 'digest', 'digestowane', 'natural flavor', 'natural flavour'], dog: 'caution', cat: 'caution', desc: 'Niejednoznaczne źródło smaku' },
  { match: ['citric acid', 'kwas cytrynowy'], dog: 'caution', cat: 'caution', desc: 'Kwas, z umiarem' },
  { match: ['tocopherols', 'mixed tocopherols', 'tokoferole', 'natural preservative'], dog: 'good', cat: 'good', desc: 'Naturalne przeciwutleniacze' },
  { match: ['vitamin', 'witamina', 'mineral', 'minerał', 'suplement', 'supplements'], dog: 'good', cat: 'good', desc: 'Niezbędne składniki odżywcze' },
  { match: ['taurine', 'tauryna'], dog: 'good', cat: 'good', desc: 'Niezbędny aminokwas, szczególnie dla kotów' },
  { match: ['glucosamine', 'glukozamina'], dog: 'good', cat: 'good', desc: 'Wspiera stawy' },
  { match: ['chondroitin', 'chondroityna'], dog: 'good', cat: 'good', desc: 'Wspiera stawy' },
  { match: ['probiotic', 'probiotyk', 'probiotics', 'kultury bakterii'], dog: 'good', cat: 'good', desc: 'Wspiera mikrobiom jelitowy' },
  { match: ['prebiotic', 'prebiotyk', 'inulin', 'inulina', 'fos'], dog: 'good', cat: 'good', desc: 'Pokarm dla dobrych bakterii jelitowych' },
  { match: ['antioxidant', 'przeciwutleniacz', 'tokoferole', 'rosemary extract', 'wyciąg z rozmarynu'], dog: 'good', cat: 'good', desc: 'Naturalne konserwanty i przeciwutleniacze' },

  // ====== WARIANTY WIELOJĘZYCZNE (OPFF zwraca składy po fr/de/nl/es/it) ======
  // Mięsa i ryby
  { match: ['volaille', 'geflügel', 'geflugel', 'kip', 'gevogelte', 'pollame', 'aves'], dog: 'good', cat: 'good', desc: 'Drób — łatwo strawne źródło białka' },
  { match: ['poulet', 'huhn', 'huhnchen', 'hähnchen', 'hahnchen', 'pollo'], dog: 'good', cat: 'good', desc: 'Kurczak — łatwo strawne źródło białka' },
  { match: ['dinde', 'pute', 'kalkoen', 'pavo'], dog: 'good', cat: 'good', desc: 'Indyk — lekkie źródło białka' },
  { match: ['canard', 'ente', 'eend', 'pato'], dog: 'good', cat: 'good', desc: 'Kaczka — dobre źródło białka' },
  { match: ['boeuf', 'rind', 'rindfleisch', 'rund', 'rundvlees', 'ternera', 'manzo', 'buey'], dog: 'good', cat: 'good', desc: 'Wołowina — cenne źródło białka i żelaza' },
  { match: ['agneau', 'lamm', 'lamsvlees', 'cordero', 'agnello'], dog: 'good', cat: 'good', desc: 'Jagnięcina — mało alergenne źródło białka' },
  { match: ['porc ', 'porc,', 'schwein', 'schweinefleisch', 'varken', 'varkensvlees', 'cerdo', 'maiale'], dog: 'caution', cat: 'caution', desc: 'Wieprzowina — tłuste mięso, z umiarem' },
  { match: ['gibier', 'wild', 'wildvlees', 'hirsch', 'venison', 'cervo'], dog: 'good', cat: 'good', desc: 'Dziczyzna — chude, hipoalergiczne białko' },
  { match: ['lapin', 'kaninchen', 'konijn', 'conejo', 'coniglio'], dog: 'good', cat: 'good', desc: 'Królik — hipoalergiczne źródło białka' },
  { match: ['saumon', 'lachs', 'zalm', 'salmone', 'salmon '], dog: 'good', cat: 'good', desc: 'Łosoś — białko i kwasy omega-3' },
  { match: ['thon', 'thunfisch', 'tonijn', 'atun', 'tonno'], dog: 'caution', cat: 'caution', desc: 'Tuńczyk — tłusta ryba, z umiarem (rtęć)' },
  { match: ['poisson', 'fisch', 'vis', 'pescado', 'pesce'], dog: 'good', cat: 'good', desc: 'Ryba — białko i kwasy omega-3' },
  { match: ['sardine', 'sardinen', 'sardina'], dog: 'good', cat: 'good', desc: 'Sardynka — cenna ryba' },
  { match: ['hareng', 'hering', 'haring', 'aringa', 'sledz'], dog: 'good', cat: 'good', desc: 'Śledź — cenne kwasy omega-3' },
  { match: ['truite', 'forelle', 'forel', 'trucha', 'trota'], dog: 'good', cat: 'good', desc: 'Pstrąg — dobre źródło białka' },
  { match: ['crevettes', 'garnelen', 'garnalen', 'gambas', 'gamberi', 'shrimp'], dog: 'good', cat: 'good', desc: 'Krewetki — chude białko' },
  { match: ['foie', 'leber', 'lever', 'higado', 'fegato', 'liver'], dog: 'good', cat: 'good', desc: 'Wątroba — bogata w witaminę A, z umiarem' },
  { match: ['oeuf', 'oeufs', 'eier', 'ei ', 'eieren', 'huevo', 'uova'], dog: 'good', cat: 'good', desc: 'Jajka — pełnowartościowe białko' },

  // Zboża, warzywa, dodatki
  { match: ['ble ', 'weizen', 'tarwe', 'trigo', 'frumento'], dog: 'caution', cat: 'caution', desc: 'Pszenica — częsty alergen i wypełniacz' },
  { match: ['mais', 'maiz', 'mais ', 'maiskorrels', 'granturco'], dog: 'caution', cat: 'caution', desc: 'Kukurydza — tani wypełniacz' },
  { match: ['riz', 'reis', 'rijst', 'arroz', 'riso'], dog: 'good', cat: 'caution', desc: 'Ryż — dobry dodatek dla psa' },
  { match: ['avoine', 'hafer', 'haver', 'avena', 'haferflocken'], dog: 'good', cat: 'caution', desc: 'Owies — zdrowe zboże dla psa' },
  { match: ['orge', 'gerste', 'gerst', 'cebada', 'orzo', 'barley'], dog: 'good', cat: 'caution', desc: 'Jęczmień — źródło błonnika' },
  { match: ['carotte', 'karotten', 'mohre', 'wortel', 'zanahoria', 'carota'], dog: 'good', cat: 'good', desc: 'Marchew — błonnik i beta-karoten' },
  { match: ['patate', 'kartoffel', 'aardappel', 'patata', 'patata dolce'], dog: 'good', cat: 'caution', desc: 'Ziemniaki — dla kota z umiarem' },
  { match: ['petits pois', 'erbsen', 'erwten', 'guisantes', 'piselli', 'pois'], dog: 'good', cat: 'caution', desc: 'Groszek — błonnik i białko roślinne' },
  { match: ['betterave', 'rote bete', 'biet', 'remolacha', 'barbabietola', 'beet pulp'], dog: 'good', cat: 'good', desc: 'Buraki — źródło błonnika' },
  { match: ['cereales', 'getreide', 'granen', 'cereales ', 'cereali'], dog: 'caution', cat: 'caution', desc: 'Zboża — często wypełniacz niskiej jakości' },
  { match: ['cellulose', 'cellulosa', 'bion', 'rohfaser', 'ruwe celstof', 'fibra'], dog: 'caution', cat: 'caution', desc: 'Błonnik/włókno — neutralny lub wypełniacz' },
  { match: ['levure', 'hefe', 'gist', 'levadura', 'lievito', 'yeast'], dog: 'good', cat: 'good', desc: 'Drożdze — źródło witamin z grupy B' },
  { match: ['propyleenglycol', 'propylene glycol', 'propylenglycol'], dog: 'caution', cat: 'avoid', desc: 'Glikol propylenowy — toksyczny dla kotów!' },
  { match: ['oignon', 'zwiebel', 'ui ', 'cebolla', 'cipolla', 'onion'], dog: 'avoid', cat: 'avoid', desc: 'Cebula — toksyczna, wywołuje anemię' },
  { match: ['ail ', 'knoblauch', 'knoflook', 'ajo ', 'aglio', 'garlic'], dog: 'avoid', cat: 'avoid', desc: 'Czosnek — toksyczny jak cebula' },
  { match: ['raisin', 'rosinen', 'rozijn', 'uva pasa', 'passa', 'raisin '], dog: 'avoid', cat: 'avoid', desc: 'Rodzynki — toksyczne dla nerek' },
  { match: ['chocolat', 'schokolade', 'chocolade', 'cioccolato', 'kakao', 'cacao'], dog: 'avoid', cat: 'avoid', desc: 'Czekolada/kakao — teobromina, toksyczne' },
  { match: ['vitamines', 'vitamine ', 'vitaminen', 'vitaminas', 'vitamins'], dog: 'good', cat: 'good', desc: 'Witaminy — niezbędne składniki odżywcze' },
  { match: ['mineraux', 'mineralien', 'mineralen', 'minerales', 'minerali'], dog: 'good', cat: 'good', desc: 'Minerały — niezbędne składniki odżywcze' },
  { match: ['conservateurs', 'konservierungsstoffe', 'conservanten', 'conservantes', 'conservanti', 'preservative'], dog: 'caution', cat: 'caution', desc: 'Konserwanty — sprawdź czy naturalne' },
  { match: ['colorants', 'farbstoffe', 'kleurstoffen', 'colorantes', 'coloranti', 'colorant'], dog: 'caution', cat: 'caution', desc: 'Barwniki — zbędny dodatek' },
  { match: ['hydrolysat', 'hydrolysat ', 'hydrolysat de', 'gehydrolyseerd', 'hydrolisat'], dog: 'good', cat: 'good', desc: 'Hydrolizat — dobrze strawne białko' },
];

function normalize(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseIngredients(text) {
  if (!text) return [];
  let normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Usuń procenty, liczby z jednostkami i nawiasy liczbowe
  normalized = normalized
    .replace(/\d+[.,]?\d*\s*%/g, ' ')
    .replace(/\(\s*\d+\s*\)/g, ' ');

  // Zamień nawiasy i myślniki na separatory, aby wydzielić podskładniki
  normalized = normalized
    .replace(/\(/g, ', ')
    .replace(/\)/g, ', ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');

  const JUNK_TOKEN = /^[\d\s.,]+$|^\d|\b(mg|g|kg|kcal|kj|iu|ie|mcg|µg|ppm|cfu)\b\.?$/i;
  const INSTRUCTION = /(endroit frais|przechow|store in|serve|swiezej wody|fresh water|feeding guide|dawkowanie|dals? 0|recipient|raadpleeg|zu verwenden|room temperature|direct sunlight|karmienia|ohren|ants|access en permanence)/i;

  return normalized
    .split(/[,;.|]| i | oraz | and | lub | or | z | w /i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && !JUNK_TOKEN.test(s) && !INSTRUCTION.test(s));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findRule(token, petType) {
  const normalized = normalize(token);
  if (!normalized) return { status: 'unknown', desc: 'Brak danych o tym składniku w bazie' };
  for (const rule of INGREDIENT_RULES) {
    for (const m of rule.match) {
      const nm = normalize(m);
      if (!nm) continue;
      const esc = escapeRegExp(nm);
      // Krótkie wzorce (<5 znaków, np. "por", "ser") wymagają pełnego słowa,
      // żeby nie łapać przypadkowych podciągów ("porc", "conserver").
      // Dłuższe wzorce dopasowujemy jako temat na początku słowa
      // (np. "wołowin" -> "wołowiny").
      const re = nm.length < 5
        ? new RegExp(`(^|[^\\w])${esc}([^\\w]|$)`, 'u')
        : new RegExp(`(^|[^\\w])${esc}[\\w]*`, 'u');
      if (re.test(normalized)) {
        return { status: rule[petType] || rule.dog || 'unknown', desc: rule.desc };
      }
    }
  }
  return { status: 'unknown', desc: 'Brak danych o tym składniku w bazie' };
}

function analyzeIngredients(text, petType = 'dog', sportDiet = null) {
  const tokens = parseIngredients(text);
  const results = [];
  const used = new Set();

  for (const token of tokens) {
    const key = normalize(token);
    if (used.has(key)) continue;
    used.add(key);

    const rule = findRule(token, petType);
    const item = {
      name: token,
      status: rule.status,
      description: rule.desc,
    };

    if (sportDiet) {
      if (checkKeywordOverlap(token, sportDiet.avoid_foods).length > 0) {
        item.sportDietFlag = 'avoid';
      } else if (checkKeywordOverlap(token, sportDiet.recommended_foods).length > 0) {
        item.sportDietFlag = 'recommended';
      }
    }

    results.push(item);
  }

  const weights = { good: 1, unknown: 1, caution: 2, avoid: 3 };
  const scores = { good: 100, unknown: 70, caution: 40, avoid: 0 };

  let totalWeight = 0;
  let weightedScore = 0;
  for (const r of results) {
    const w = weights[r.status] || 1;
    totalWeight += w;
    weightedScore += (scores[r.status] || 70) * w;
  }

  const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

  let verdict = 'Nieznana';
  let verdictClass = 'neutral';
  if (score >= 90) {
    verdict = 'Świetny wybór';
    verdictClass = 'excellent';
  } else if (score >= 70) {
    verdict = 'Dobra karma';
    verdictClass = 'good';
  } else if (score >= 50) {
    verdict = 'Akceptowalna';
    verdictClass = 'fair';
  } else if (score >= 30) {
    verdict = 'Słaba jakość';
    verdictClass = 'poor';
  } else {
    verdict = 'Niepolecana';
    verdictClass = 'bad';
  }

  const response = {
    score,
    verdict,
    verdictClass,
    petType,
    ingredients: results,
    summary: {
      good: results.filter((r) => r.status === 'good').length,
      caution: results.filter((r) => r.status === 'caution').length,
      avoid: results.filter((r) => r.status === 'avoid').length,
      unknown: results.filter((r) => r.status === 'unknown').length,
    },
  };

  if (sportDiet) {
    response.sportDiet = {
      name: sportDiet.name,
      key: sportDiet.key,
      conflicts: results.filter((r) => r.sportDietFlag === 'avoid').map((r) => r.name),
      recommended: results.filter((r) => r.sportDietFlag === 'recommended').map((r) => r.name),
    };
  }

  return response;
}

// ====== ŹRÓDŁA DANYCH O PRODUKCIE ======

// Open Food Facts / Open Pet Food Facts — pełny rekord produktu.
async function fetchOFFProduct(barcode) {
  const bases = [
    'https://world.openpetfoodfacts.org',
    'https://world.openfoodfacts.org',
  ];
  for (const base of bases) {
    try {
      const response = await fetch(
        `${base}/api/v0/product/${encodeURIComponent(barcode)}.json`,
        { headers: { 'User-Agent': 'Petvio-FoodScanner/1.0' } }
      );
      const data = await response.json();
      if (data.status === 1 && data.product) return data.product;
    } catch (err) {
      console.error(`OFF fetch error (${base}):`, err.message);
    }
  }
  return null;
}

// Zewnętrzne lookupy EAN — zwracają przynajmniej nazwę i markę.
async function fetchExternalBarcode(barcode) {
  const sources = [
    {
      url: `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      parse: (d) => {
        const item = d.items && d.items[0];
        return item ? { name: item.title || '', brand: item.brand || '' } : null;
      },
    },
    {
      url: `https://barcode.monster/api/${encodeURIComponent(barcode)}`,
      parse: (d) => (d.description || d.company ? { name: d.description || '', brand: d.company || '' } : null),
    },
    {
      url: `https://go-upc.com/api/v1/code/${encodeURIComponent(barcode)}`,
      parse: (d) => (d.product ? { name: d.product.name || '', brand: d.product.brand || '' } : null),
    },
  ];

  for (const src of sources) {
    try {
      const response = await fetch(src.url, {
        headers: { 'User-Agent': 'Petvio-FoodScanner/1.0', Accept: 'application/json' },
      });
      if (!response.ok) continue;
      const data = await response.json();
      const meta = src.parse(data);
      if (meta && (meta.name || meta.brand)) return meta;
    } catch (err) {
      // cichy fallback na kolejne źródło
    }
  }
  return null;
}

// ====== Diety specjalistyczne — konflikty z produktem ======

const normalizeKeyword = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Sprawdza czy składniki produktu kolidują z zakazanymi
// składnikami aktywnych diet specjalistycznych pupila.
async function getSpecialDietConflicts(petId, ingredientsText) {
  if (!petId || !ingredientsText) return [];
  const result = await query(
    `SELECT name, diet_type, forbidden_foods
     FROM special_diets
     WHERE pet_id = $1 AND is_active = true`,
    [petId]
  );
  const ingredientsNorm = normalizeKeyword(ingredientsText);
  const conflicts = [];
  for (const diet of result.rows) {
    if (!diet.forbidden_foods) continue;
    const forbidden = diet.forbidden_foods
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3);
    const matched = forbidden.filter((f) => keywordItemMatches(ingredientsNorm, f));
    if (matched.length > 0) {
      conflicts.push({
        dietName: diet.name,
        dietType: diet.diet_type,
        matchedFoods: matched,
      });
    }
  }
  return conflicts;
}

// ====== HANDLERY ======

const checkPetAccess = async (petId, userId, res) => {
  if (!petId) return true;
  const r = await query('SELECT is_frozen FROM pets WHERE id = $1 AND user_id = $2', [petId, userId]);
  if (r.rows.length === 0) {
    res.status(404).json({ error: { message: 'Zwierzę nie zostało znalezione', status: 404 } });
    return false;
  }
  if (r.rows[0].is_frozen) {
    petFrozen(res);
    return false;
  }
  return true;
};

async function scanBarcode(req, res) {
  try {
    const { barcode, petType, petId } = req.query;
    if (!barcode || barcode.length < 5) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy kod kreskowy', status: 400 } });
    }
    if (!(await checkPetAccess(petId, req.user.userId, res))) return;

    const sportDiet = petId ? await getActiveSportDietForPet(petId) : null;

    // Kaskada źródeł danych o produkcie. Karmy dla zwierząt są
    // przede wszystkim w Open Pet Food Facts; kolejne serwisy
    // zwracają tylko nazwę i markę — NIGDY nie podstawiamy składu
    // innego produktu, bo to byłaby błędna analiza.
    let product = await fetchOFFProduct(barcode);
    let lookupMeta = null;

    if (!product) {
      const ext = await fetchExternalBarcode(barcode);
      if (ext && (ext.name || ext.brand)) {
        lookupMeta = ext;
      }
    }

    if (!product && !lookupMeta) {
      return res.status(200).json({
        found: false,
        barcode,
        message: 'Nie znaleziono produktu w żadnej bazie. Wpisz skład ręcznie.',
      });
    }

    if (!product) {
      // Znamy tylko nazwę/markę z zewnętrznego lookupu — bez składu.
      return res.status(200).json({
        found: true,
        partial: true,
        barcode,
        product: {
          barcode,
          name: lookupMeta.name || 'Nieznany produkt',
          brands: lookupMeta.brand || '',
          image: '',
          ingredientsText: '',
          allergens: [],
          nutrients: null,
        },
        analysis: null,
        message: 'Znaleziono produkt, ale baza nie zawiera składu. Wpisz skład ręcznie z opakowania.',
      });
    }

    const ingredientsText =
      product.ingredients_text_pl ||
      product.ingredients_text_en ||
      product.ingredients_text_de ||
      product.ingredients_text_fr ||
      product.ingredients_text ||
      (Array.isArray(product.ingredients)
        ? product.ingredients.map((i) => (i.id ? i.id.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ') : i.text)).join(', ')
        : '') ||
      '';

    const result = {
      found: true,
      barcode,
      product: {
        barcode,
        name: product.product_name || product.generic_name || (lookupMeta && lookupMeta.name) || 'Nieznany produkt',
        brands: product.brands || (lookupMeta && lookupMeta.brand) || '',
        image: product.image_front_small_url || product.image_front_url || '',
        ingredientsText,
        allergens: product.allergens ? product.allergens.split(',').map((a) => a.trim()).filter(Boolean) : [],
        nutrients: product.nutriments
          ? {
              energy: product.nutriments['energy-kcal_100g'] || null,
              proteins: product.nutriments.proteins_100g || null,
              fat: product.nutriments.fat_100g || null,
              carbs: product.nutriments.carbohydrates_100g || null,
              sugars: product.nutriments.sugars_100g || null,
              salt: product.nutriments.salt_100g || null,
            }
          : null,
      },
      analysis: ingredientsText ? analyzeIngredients(ingredientsText, petType || 'dog', sportDiet) : null,
    };

    res.json(result);
  } catch (error) {
    console.error('Scan barcode error:', error);
    res.status(500).json({
      error: {
        message: 'Błąd podczas pobierania danych o produkcie',
        status: 500,
      },
    });
  }
}

async function analyze(req, res) {
  try {
    const { ingredients, petType, petId } = req.body;
    if (!ingredients || !ingredients.trim()) {
      return res.status(400).json({ error: { message: 'Wpisz skład do analizy', status: 400 } });
    }
    if (!(await checkPetAccess(petId, req.user.userId, res))) return;

    const sportDiet = petId ? await getActiveSportDietForPet(petId) : null;

    const analysis = analyzeIngredients(ingredients, petType || 'dog', sportDiet);
    if (petId) {
      analysis.dietConflicts = await getSpecialDietConflicts(petId, ingredients);
    }
    res.json(analysis);
  } catch (error) {
    console.error('Analyze ingredients error:', error);
    res.status(500).json({
      error: {
        message: 'Błąd podczas analizy składników',
        status: 500,
      },
    });
  }
}

// Wyszukiwanie produktu po nazwie — fallback gdy kod nie istnieje.
async function searchProducts(req, res) {
  try {
    const { q, petType } = req.query;
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ error: { message: 'Wpisz co najmniej 3 znaki', status: 400 } });
    }

    const bases = [
      'https://world.openpetfoodfacts.org',
      'https://world.openfoodfacts.org',
    ];

    const seen = new Set();
    const results = [];

    for (const base of bases) {
      try {
        const url = `${base}/cgi/search.pl?search_terms=${encodeURIComponent(q.trim())}&search_simple=1&action=process&json=1&page_size=10`;
        const response = await fetch(url, { headers: { 'User-Agent': 'Petvio-FoodScanner/1.0' } });
        const data = await response.json();
        for (const p of data.products || []) {
          if (!p.code || seen.has(p.code)) continue;
          seen.add(p.code);
          const hasIngredients = Boolean(
            p.ingredients_text || p.ingredients_text_en || p.ingredients_text_de ||
            p.ingredients_text_fr || (p.ingredients && p.ingredients.length)
          );
          results.push({
            barcode: p.code,
            name: p.product_name || p.generic_name || 'Nieznany produkt',
            brands: p.brands || '',
            image: p.image_front_small_url || p.image_front_url || '',
            hasIngredients,
          });
          if (results.length >= 12) break;
        }
        if (results.length >= 12) break;
      } catch (err) {
        console.error(`Product search error (${base}):`, err.message);
      }
    }

    res.json({ results, petType: petType || 'dog' });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ error: { message: 'Błąd podczas wyszukiwania produktu', status: 500 } });
  }
}

module.exports = {
  scanBarcode,
  analyze,
  searchProducts,
};
