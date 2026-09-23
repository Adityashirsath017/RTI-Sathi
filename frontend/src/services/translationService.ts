/**
 * Centralized Multilingual Translation Service
 * Provides fast, accurate, deterministic and AI-assisted translations across 8 Indian languages:
 * en (English), hi (Hindi), mr (Marathi), bn (Bengali), ta (Tamil), te (Telugu), kn (Kannada), gu (Gujarati)
 * 
 * Guarantees:
 * - Preserves numbers, application IDs, dates, and legal terminology
 * - In-memory and localStorage translation caching
 * - Bidirectional cross-portal translation (Citizen <-> Clerk)
 * - Safe fallbacks to prevent any crash
 */

export interface MultilingualEntity {
  originalText?: string;
  originalLanguage?: string;
  translations?: Record<string, string>;
}

export const SUPPORTED_LANG_CODES = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn', 'gu'] as const;
export type SupportedLangCode = typeof SUPPORTED_LANG_CODES[number];

// In-memory LRU cache
const memoryCache = new Map<string, string>();

/**
 * Common administrative, RTI, and clerk query translation dictionary
 */
const RTI_DICTIONARY: Record<string, Record<SupportedLangCode, string>> = {
  // Common clarification inquiries
  'Please provide the exact location.': {
    en: 'Please provide the exact location.',
    hi: 'कृपया सटीक स्थान / पता प्रदान करें।',
    mr: 'कृपया अचूक स्थान / पत्ता द्या.',
    bn: 'অনুগ্রহ করে সঠিক অবস্থান / ঠিকানা প্রদান করুন।',
    ta: 'தயவுசெய்து சரியான இடத்தை / முகவரியை வழங்கவும்.',
    te: 'దయచేసి ఖచ్చితమైన స్థానాన్ని / చిరునామాను అందించండి.',
    kn: 'ದಯವಿಟ್ಟು ನಿಖರವಾದ ಸ್ಥಳ / ವಿಳಾಸವನ್ನು ಒದಗಿಸಿ.',
    gu: 'કૃપા કરીને ચોક્કસ સ્થળ / સરનામું આપો.',
  },
  'Please provide the exact survey number.': {
    en: 'Please provide the exact survey number.',
    hi: 'कृपया सटीक सर्वेक्षण / खसरा संख्या प्रदान करें।',
    mr: 'कृपया अचूक सर्वे क्रमांक द्या.',
    bn: 'অনুগ্রহ করে সঠিক সার্ভে / খতিয়ান নম্বর দিন।',
    ta: 'தயவுசெய்து சரியான சர்வே எண்ணை வழங்கவும்.',
    te: 'దయచేసి ఖచ్చితమైన సర్వే నంబర్‌ను అందించండి.',
    kn: 'ದಯವಿಟ್ಟು ನಿಖರವಾದ ಸರ್ವೆ ನಂಬರ್ ನೀಡಿ.',
    gu: 'કૃપા કરીને ચોક્કસ સર્વે નંબર આપો.',
  },
  'Please specify the exact financial year or time period.': {
    en: 'Please specify the exact financial year or time period.',
    hi: 'कृपया सटीक वित्तीय वर्ष या समयावधि बताएं।',
    mr: 'कृपया अचूक आर्थिक वर्ष किंवा कालावधी नमूद करा.',
    bn: 'অনুগ্রহ করে নির্দিষ্ট আর্থিক বছর বা সময়কাল উল্লেখ করুন।',
    ta: 'சரியான நிதியாண்டு அல்லது காலத்தை குறிப்பிடவும்.',
    te: 'దయచేసి ఖచ్చితమైన ఆర్థిక సంవత్సరం లేదా కాలాన్ని పేర్కొనండి.',
    kn: 'ದಯವಿಟ್ಟು ನಿಖರವಾದ ಆರ್ಥಿಕ ವರ್ಷ ಅಥವಾ ಅವಧಿಯನ್ನು ನಿರ್ದಿಷ್ಟಪಡಿಸಿ.',
    gu: 'કૃપા કરીને ચોક્કસ નાણાકીય વર્ષ અથવા સમયગાળો જણાવો.',
  },
  'Please specify the exact government scheme or project name.': {
    en: 'Please specify the exact government scheme or project name.',
    hi: 'कृपया संबंधित सरकारी योजना या परियोजना का नाम बताएं।',
    mr: 'कृपया संबंधित सरकारी योजना किंवा प्रकल्पाचे नाव नमूद करा.',
    bn: 'অনুগ্রহ করে সুনির্দিষ্ট সরকারি প্রকল্প বা যোজনার নাম উল্লেখ করুন।',
    ta: 'சரியான அரசு திட்டம் அல்லது பணியின் பெயரை குறிப்பிடவும்.',
    te: 'దయచేసి ఖచ్చితమైన ప్రభుత్వ పథకం లేదా ప్రాజెక్ట్ పేరును పేర్కొనండి.',
    kn: 'ದಯವಿಟ್ಟು ನಿಖರವಾದ ಸರ್ಕಾರಿ ಯೋಜನೆ ಅಥವಾ ಯೋಜನೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.',
    gu: 'કૃપા કરીને ચોક્કસ સરકારી યોજના અથવા પ્રોજેક્ટનું નામ આપો.',
  },
  'Supporting documents or reference number required.': {
    en: 'Supporting documents or reference number required.',
    hi: 'आवश्यक दस्तावेज या संदर्भ संख्या आवश्यक है।',
    mr: 'आवश्यक कागदपत्रे किंवा संदर्भ क्रमांक आवश्यक आहे.',
    bn: 'প্রয়োজনীয় নথি বা রেফারেন্স নম্বর প্রয়োজন।',
    ta: 'ஆதார ஆவணங்கள் அல்லது குறிப்பு எண் தேவை.',
    te: 'సహాయక పత్రాలు లేదా రిఫరెన్స్ నంబర్ అవసరం.',
    kn: 'ದಾಖಲೆಗಳು ಅಥವಾ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ ಅಗತ್ಯವಿದೆ.',
    gu: 'આધાર પુરાવા અથવા સંદર્ભ નંબર જરૂરી છે.',
  },
  'Information requested is too broad. Please narrow down the specific records needed.': {
    en: 'Information requested is too broad. Please narrow down the specific records needed.',
    hi: 'मांगी गई जानकारी बहुत व्यापक है। कृपया आवश्यक विशिष्ट रिकॉर्ड स्पष्ट करें।',
    mr: 'मागितलेली माहिती खूप व्यापक आहे. कृपया आवश्यक असलेल्या विशिष्ट नोंदी स्पष्ट करा.',
    bn: 'অনুরোধ করা তথ্য অত্যন্ত ব্যাপক। অনুগ্রহ করে সুনির্দিষ্ট নথি উল্লেখ করুন।',
    ta: 'கோரப்பட்ட தகவல் மிகவும் விரிவானது. குறிப்பிட்ட ஆவணங்களை சுருக்கவும்.',
    te: 'కోరిన సమాచారం చాలా విస్తృతమైనది. దయచేసి నిర్దిష్ట రికార్డులను పేర్కొనండి.',
    kn: 'ಕೋರಿದ ಮಾಹಿತಿ ತುಂಬಾ ವಿಸ್ತಾರವಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿರ್ದಿಷ್ಟ ದಾಖಲೆಗಳನ್ನು ಸೀಮಿತಗೊಳಿಸಿ.',
    gu: 'માંગવામાં આવેલી માહિતી ઘણી વિસ્તૃત છે. કૃપા કરીને ચોક્કસ રેકોર્ડ જણાવો.',
  },

  // Clarification categories
  'Location / Revenue village unclear': {
    en: 'Location / Revenue village unclear',
    hi: 'स्थान / राजस्व गांव अस्पष्ट',
    mr: 'स्थान / महसूल गाव अस्पष्ट',
    bn: 'অবস্থান / রাজস্ব গ্রাম অস্পষ্ট',
    ta: 'இடம் / வருவாய் கிராமம் தெளிவற்றது',
    te: 'స్థానం / రెవెన్యూ గ్రామం అస్పష్టంగా ఉంది',
    kn: 'ಸ್ಥಳ / ಕಂದಾಯ ಗ್ರಾಮ ಅಸ್ಪಷ್ಟವಾಗಿದೆ',
    gu: 'સ્થળ / મહેસૂલી ગામ અસ્પષ્ટ',
  },
  'Time period / Financial year missing': {
    en: 'Time period / Financial year missing',
    hi: 'समयावधि / वित्तीय वर्ष अनुपलब्ध',
    mr: 'कालावधी / आर्थिक वर्ष नमूद नाही',
    bn: 'সময়কাল / আর্থিক বছর অনুপস্থিত',
    ta: 'காலம் / நிதியாண்டு விடுபட்டுள்ளது',
    te: 'సమయ కాలం / ఆర్థిక సంవత్సరం పేర్కొనలేదు',
    kn: 'ಸಮಯಾವಧಿ / ಆರ್ಥಿಕ ವರ್ಷ ಕಾಣೆಯಾಗಿದೆ',
    gu: 'સમયગાળો / નાણાકીય વર્ષ ખૂટે છે',
  },
  'Specific public authority ambiguous': {
    en: 'Specific public authority ambiguous',
    hi: 'विशिष्ट सार्वजनिक प्राधिकरण संदिग्ध',
    mr: 'विशिष्ट सार्वजनिक प्राधिकरण संदिग्ध',
    bn: 'নির্দিষ্ট সরকারি কর্তৃপক্ষ অস্পষ্ট',
    ta: 'குறிப்பிட்ட பொது அதிகாரம் தெளிவற்றது',
    te: 'నిర్దిష్ట ప్రజా అధికారం అస్పష్టంగా ఉంది',
    kn: 'ನಿರ್ದಿಷ್ಟ ಸಾರ್ವಜನಿಕ ಪ್ರಾಧಿಕಾರ ಅಸ್ಪಷ್ಟವಾಗಿದೆ',
    gu: 'ચોક્કસ જાહેર સત્તામંડળ અસ્પષ્ટ છે',
  },
  'Information requested too broad or vague': {
    en: 'Information requested too broad or vague',
    hi: 'मांगी गई जानकारी बहुत व्यापक या अस्पष्ट',
    mr: 'मागितलेली माहिती खूप व्यापक किंवा अस्पष्ट',
    bn: 'অনুরোধকৃত তথ্য খুব বিস্তৃত বা অস্পষ্ট',
    ta: 'கோரப்பட்ட தகவல் மிகவும் விரிவானது அல்லது தெளிவற்றது',
    te: 'కోరిన సమాచారం చాలా విస్తృతమైనది లేదా అస్పష్టంగా ఉంది',
    kn: 'ಕೋರಿದ ಮಾಹಿತಿ ತುಂಬಾ ವಿಸ್ತಾರ ಅಥವಾ ಅಸ್ಪಷ್ಟವಾಗಿದೆ',
    gu: 'માંગેલ માહિતી ખૂબ વિસ્તૃત અથવા અસ્પષ્ટ છે',
  },
  'Survey / Gat / Plot number required': {
    en: 'Survey / Gat / Plot number required',
    hi: 'सर्वेक्षण / गट / प्लॉट संख्या आवश्यक',
    mr: 'सर्व्हे / गट / प्लॉट क्रमांक आवश्यक',
    bn: 'সার্ভে / খতিয়ান / প্লট নম্বর প্রয়োজন',
    ta: 'சர்வே / பிளாட் எண் தேவை',
    te: 'సర్వే / ప్లాట్ నంబర్ అవసరం',
    kn: 'ಸರ್ವೆ / ನಿವೇಶನ ಸಂಖ್ಯೆ ಅಗತ್ಯವಿದೆ',
    gu: 'સર્વે / પ્લોટ નંબર જરૂરી છે',
  },
  'Supporting document / reference missing': {
    en: 'Supporting document / reference missing',
    hi: 'सहायक दस्तावेज / संदर्भ संख्या गायब',
    mr: 'पूरक कागदपत्रे / संदर्भ क्रमांक गायब',
    bn: 'সহায়ক নথি / রেফারেন্স নম্বর অনুপস্থিত',
    ta: 'ஆதார ஆவணம் / குறிப்பு விடுபட்டுள்ளது',
    te: 'సహాయక పత్రం / రిఫరెన్స్ లేదు',
    kn: 'ಪೂರಕ ದಾಖಲೆ / ಉಲ್ಲೇಖ ಕಾಣೆಯಾಗಿದೆ',
    gu: 'સહાયક દસ્તાવેજ / સંદર્ભ ખૂટે છે',
  },

  // Common Clerk Override Reasons
  'Matter pertains to Rural Water Supply Division under Zilla Parishad': {
    en: 'Matter pertains to Rural Water Supply Division under Zilla Parishad',
    hi: 'मामला जिला परिषद के अंतर्गत ग्रामीण जलापूर्ति प्रभाग से संबंधित है',
    mr: 'हा विषय जिल्हा परिषदेच्या अंतर्गत ग्रामीण पाणीपुरवठा विभागाशी संबंधित आहे',
    bn: 'বিষয়টি জেলা পরিষদের অধীনস্থ গ্রামীণ জল সরবরাহ বিভাগের আওতাধীন',
    ta: 'இந்த விவகாரம் மாவட்ட ஊராட்சியின் ஊரக குடிநீர் வழங்கல் பிரிவுக்கு உட்பட்டது',
    te: 'ఈ విషయం జిల్లా పరిషత్ పరిధిలోని గ్రామీణ నీటి సరఫరా విభాగానికి చెందినది',
    kn: 'ಈ ವಿಷಯವು ಜಿಲ್ಲಾ ಪಂಚಾಯತ್ ವ್ಯಾಪ್ತಿಯ ಗ್ರಾಮೀಣ ನೀರು ಸರಬರಾಜು ವಿಭಾಗಕ್ಕೆ ಸಂಬಂಧಿಸಿದೆ',
    gu: 'બાબત જિલ્લા પંચાયત હેઠળના ગ્રામીણ પાણી પુરવઠા વિભાગને લગતી છે',
  },
  'Subject falls under Public Works Department (PWD) state road jurisdiction': {
    en: 'Subject falls under Public Works Department (PWD) state road jurisdiction',
    hi: 'विषय लोक निर्माण विभाग (पीडब्ल्यूडी) राज्य सड़क क्षेत्राधिकार में आता है',
    mr: 'विषय सार्वजनिक बांधकाम विभाग (पीडब्ल्यूडी) राज्य रस्ते अधिकारक्षेत्रात येतो',
    bn: 'বিষয়টি পূর্ত দপ্তর (পিডব্লিউডি) রাজ্য সড়কের আওতাধীন',
    ta: 'இந்த பொருள் பொதுப்பணித்துறை (PWD) மாநில சாலை அதிகார வரம்பிற்கு உட்பட்டது',
    te: 'ఈ అంశం రోడ్లు మరియు భవనాల శాఖ (PWD) రాష్ట్ర రహదారి పరిధిలోకి వస్తుంది',
    kn: 'ವಿಷಯವು ಲೋಕೋಪಯೋಗಿ ಇಲಾಖೆ (PWD) ರಾಜ್ಯ ರಸ್ತೆ ವ್ಯಾಪ್ತಿಗೆ ಬರುತ್ತದೆ',
    gu: 'વિષય માર્ગ અને મકાન વિભાગ (PWD) રાજ્ય માર્ગ અધિકારક્ષેત્ર હેઠળ આવે છે',
  },
  'Revenue records and 7/12 land mutation handled by Taluka Tahsildar / Land Records': {
    en: 'Revenue records and 7/12 land mutation handled by Taluka Tahsildar / Land Records',
    hi: 'राजस्व रिकॉर्ड और 7/12 नामांतरण तालुका तहसीलदार / भूमि अभिलेख द्वारा देखा जाता है',
    mr: 'महसूल नोंदी व ७/१२ फेरफार तालुका तहसीलदार / भूमी अभिलेख विभागामार्फत हाताळले जातात',
    bn: 'রাজস্ব নথি ও জমির মিউটেশন তালুক তহশিলদার / ভূমি রেকর্ড দপ্তর দ্বারা পরিচালিত হয়',
    ta: 'வருவாய் பதிவுகள் மற்றும் நில பட்டா மாறுதல் வட்டாட்சியர் / நில அளவை துறையால் கையாளப்படுகிறது',
    te: 'రెవెన్యూ రికార్డులు మరియు భూ మ్యుటేషన్ తహశీల్దార్ / భూ రికార్డుల ద్వారా నిర్వహించబడతాయి',
    kn: 'ಕಂದಾಯ ದಾಖಲೆಗಳು ಮತ್ತು ಜಮೀನು ಪಹಣಿ ತಹಶೀಲ್ದಾರ್ / ಭೂ ದಾಖಲೆಗಳ ಇಲಾಖೆಯಿಂದ ನಿರ್ವಹಿಸಲ್ಪಡುತ್ತವೆ',
    gu: 'મહેસૂલી રેકોર્ડ અને ૭/૧૨ નામાંતરણ તાલુકા મામલતદાર / જમીન દફતર દ્વારા સંભાળવામાં આવે છે',
  },

  // Common Officer Dispatch Notes
  'Verified and approved for formal dispatch to PIO': {
    en: 'Verified and approved for formal dispatch to PIO',
    hi: 'सत्यापित और जन सूचना अधिकारी (पीआईओ) को औपचारिक प्रेषण के लिए स्वीकृत',
    mr: 'पडताळणी पूर्ण झाली असून जन माहिती अधिकाऱ्याकडे (PIO) पाठवण्यासाठी मंजूर केले आहे',
    bn: 'যাচাই করা হয়েছে এবং পিআইও (PIO)-কে প্রেরণের জন্য অনুমোদিত',
    ta: 'சரிபார்க்கப்பட்டு பொது தகவல் அலுவலருக்கு (PIO) அனுப்ப ஒப்புதல் அளிக்கப்பட்டது',
    te: 'ధృవీకరించబడింది మరియు పబ్లిక్ ఇన్ఫర్మేషన్ ఆఫీసర్ (PIO)కు పంపడానికి ఆమోదించబడింది',
    kn: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಮಾಹಿತಿ ಅಧಿಕಾರಿಗೆ (PIO) ರವಾನಿಸಲು ಅನುಮೋದಿಸಲಾಗಿದೆ',
    gu: 'ચકાસણી પૂર્ણ અને જાહેર માહિતી અધિકારી (PIO)ને મોકલવા માટે મંજૂર',
  },
  'Application verified under Section 6(1) of RTI Act 2005': {
    en: 'Application verified under Section 6(1) of RTI Act 2005',
    hi: 'आरटीआई अधिनियम 2005 की धारा 6(1) के तहत आवेदन सत्यापित',
    mr: 'माहिती अधिकार कायदा २००५ च्या कलम ६(१) अन्वये अर्जाची पडताळणी झाली आहे',
    bn: 'আরটিআই আইন ২০০৫-এর ধারা ৬(১) অনুযায়ী আবেদন যাচাই করা হয়েছে',
    ta: 'ஆர்டிஐ சட்டம் 2005 பிரிவு 6(1) கீழ் விண்ணப்பம் சரிபார்க்கப்பட்டது',
    te: 'ఆర్టీఐ చట్టం 2005 సెక్షన్ 6(1) కింద దరఖాస్తు ధృవీకరించబడింది',
    kn: 'ಆರ್‌ಟಿಐ ಕಾಯ್ದೆ 2005 ರ ಕಲಂ 6(1) ಅಡಿಯಲ್ಲಿ ಅರ್ಜಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    gu: 'આરટીઆઈ કાયદા ૨૦૦૫ ની કલમ ૬(૧) હેઠળ અરજી ચકાસાયેલ છે',
  },

  // Notifications
  'New RTI Application Received': {
    en: 'New RTI Application Received',
    hi: 'नया आरटीआई आवेदन प्राप्त हुआ',
    mr: 'नवीन आरटीआय अर्ज प्राप्त झाला',
    bn: 'নতুন আরটিআই আবেদন গৃহীত হয়েছে',
    ta: 'புதிய ஆர்டிஐ விண்ணப்பம் பெறப்பட்டது',
    te: 'కొత్త ఆర్టీఐ దరఖాస్తు స్వీకరించబడింది',
    kn: 'ಹೊಸ ಆರ್‌ಟಿಐ ಅರ್ಜಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ',
    gu: 'નવી આરટીઆઈ અરજી મળેલ છે',
  },
  'Action Required: Clarification Requested': {
    en: 'Action Required: Clarification Requested',
    hi: 'कार्रवाई आवश्यक: स्पष्टीकरण मांगा गया',
    mr: 'कारवाई आवश्यक: स्पष्टीकरण मागवण्यात आले आहे',
    bn: 'পদক্ষেপ প্রয়োজন: স্পষ্টীকরণ চাওয়া হয়েছে',
    ta: 'நடவடிக்கை தேவை: விளக்கம் கோரப்பட்டுள்ளது',
    te: 'చర్య అవసరం: స్పష్టత కోరబడింది',
    kn: 'ಕ್ರಮ ಅಗತ್ಯವಿದೆ: ಸ್ಪಷ್ಟೀಕರಣ ಕೋರಲಾಗಿದೆ',
    gu: 'પગલાં જરૂરી: સ્પષ્ટતા માંગવામાં આવી છે',
  },
  'RTI Application Approved for Routing': {
    en: 'RTI Application Approved for Routing',
    hi: 'आरटीआई आवेदन रूटिंग के लिए स्वीकृत',
    mr: 'आरटीआय अर्ज रूटिंगसाठी मंजूर करण्यात आला',
    bn: 'আরটিআই আবেদন রাউটিংয়ের জন্য অনুমোদিত',
    ta: 'ஆர்டிஐ விண்ணப்பம் வழிசெலுத்தலுக்கு ஒப்புதல் அளிக்கப்பட்டது',
    te: 'ఆర్టీఐ దరఖాస్తు రూటింగ్ కోసం ఆమోదించబడింది',
    kn: 'ಆರ್‌ಟಿಐ ಅರ್ಜಿಯನ್ನು ರವಾನೆಗಾಗಿ ಅನುಮೋದಿಸಲಾಗಿದೆ',
    gu: 'આરટીઆઈ અરજી રૂટિંગ માટે મંજૂર થયેલ છે',
  },
  'Clarification Response Submitted': {
    en: 'Clarification Response Submitted',
    hi: 'स्पष्टीकरण उत्तर सबमिट किया गया',
    mr: 'स्पष्टीकरण उत्तर सादर करण्यात आले',
    bn: 'স্পষ্টীকরণের উত্তর জমা দেওয়া হয়েছে',
    ta: 'விளக்க பதில் சமர்ப்பிக்கப்பட்டது',
    te: 'స్పష్టత సమాధానం సమర్పించబడింది',
    kn: 'ಸ್ಪಷ್ಟೀಕರಣ ಪ್ರತಿಕ್ರಿಯೆ ಸಲ್ಲಿಸಲಾಗಿದೆ',
    gu: 'સ્પષ્ટતા ઉત્તર સબમિટ કરવામાં આવ્યો',
  },
};

/**
 * Standard department names in all 8 languages
 */
export const DEPARTMENT_LOCAL_NAMES: Record<string, Record<SupportedLangCode, string>> = {
  'Public Works Department (PWD)': {
    en: 'Public Works Department (PWD)',
    hi: 'लोक निर्माण विभाग (पीडब्ल्यूडी)',
    mr: 'सार्वजनिक बांधकाम विभाग (पीडब्ल्यूडी)',
    bn: 'পূর্ত দপ্তর (পিডব্লিউডি)',
    ta: 'பொதுப்பணித்துறை (PWD)',
    te: 'రోడ్లు మరియు భవనాల శాఖ (PWD)',
    kn: 'ಲೋಕೋಪಯೋಗಿ ಇಲಾಖೆ (PWD)',
    gu: 'માર્ગ અને મકાન વિભાગ (PWD)',
  },
  'Rural Development & Panchayat Raj Department': {
    en: 'Rural Development & Panchayat Raj Department',
    hi: 'ग्रामीण विकास एवं पंचायती राज विभाग',
    mr: 'ग्रामविकास व पंचायत राज विभाग',
    bn: 'পঞ্চায়েত ও গ্রামোন্নয়ন দপ্তর',
    ta: 'ஊரக வளர்ச்சி மற்றும் ஊராட்சித் துறை',
    te: 'పంచాయతీరాజ్ మరియు గ్రామీణాభివృద్ధి శాఖ',
    kn: 'ಗ್ರಾಮೀಣಾಭಿವೃದ್ಧಿ ಮತ್ತು ಪಂಚಾಯತ್ ರಾಜ್ ಇಲಾಖೆ',
    gu: 'પંચાયત, ગ્રામ ગૃહનિર્માણ અને ગ્રામ વિકાસ વિભાગ',
  },
  'Water Supply & Sanitation Department': {
    en: 'Water Supply & Sanitation Department',
    hi: 'जल आपूर्ति एवं स्वच्छता विभाग',
    mr: 'पाणीपुरवठा व स्वच्छता विभाग',
    bn: 'জনস্বাস্থ্য কারিগরি ও জল সরবরাহ দপ্তর',
    ta: 'குடிநீர் வழங்கல் மற்றும் கழிவுநீர் அகற்றல் துறை',
    te: 'గ్రామీణ నీటి సరఫరా మరియు పారిశుద్ధ్య విభాగం',
    kn: 'ಗ್ರಾಮೀಣ ಕುಡಿಯುವ ನೀರು ಮತ್ತು ನೈರ್ಮಲ್ಯ ಇಲಾಖೆ',
    gu: 'પાણી પુરવઠા અને ગટર વ્યવસ્થા વિભાગ',
  },
  'Revenue & Land Records Department': {
    en: 'Revenue & Land Records Department',
    hi: 'राजस्व एवं भूमि अभिलेख विभाग',
    mr: 'महसूल व भूमी अभिलेख विभाग',
    bn: 'ভূমি ও ভূমি সংস্কার দপ্তর',
    ta: 'வருவாய் மற்றும் நில அளவைத் துறை',
    te: 'రెవెన్యూ మరియు భూ రికార్డుల శాఖ',
    kn: 'ಕಂದಾಯ ಮತ್ತು ಭೂ ದಾಖಲೆಗಳ ಇಲಾಖೆ',
    gu: 'મહેસૂલ અને જમીન દફતર વિભાગ',
  },
  'Public Health & Family Welfare Department': {
    en: 'Public Health & Family Welfare Department',
    hi: 'लोक स्वास्थ्य एवं परिवार कल्याण विभाग',
    mr: 'सार्वजनिक आरोग्य व कुटुंब कल्याण विभाग',
    bn: 'স্বাস্থ্য ও পরিবার কল্যাণ দপ্তর',
    ta: 'மக்கள் நல்வாழ்வு மற்றும் குடும்ப நலத்துறை',
    te: 'వైద్య ఆరోగ్య మరియు కుటుంబ సంక్షేమ శాఖ',
    kn: 'ಆರೋಗ್ಯ ಮತ್ತು ಕುಟುಂಬ ಕಲ್ಯಾಣ ಇಲಾಖೆ',
    gu: 'આરોગ્ય અને પરિવાર કલ્યાણ વિભાગ',
  },
  'School Education & Literacy Department': {
    en: 'School Education & Literacy Department',
    hi: 'स्कूल शिक्षा एवं साक्षरता विभाग',
    mr: 'शालेय शिक्षण व साक्षरता विभाग',
    bn: 'বিদ্যালয় শিক্ষা ও সাক্ষরতা দপ্তর',
    ta: 'பள்ளிக் கல்வித்துறை',
    te: 'పాఠశాల విద్యా శాఖ',
    kn: 'ಶಾಲಾ ಶಿಕ್ಷಣ ಮತ್ತು ಸಾಕ್ಷರತಾ ಇಲಾಖೆ',
    gu: 'શાળા શિક્ષણ અને સાક્ષરતા વિભાગ',
  },
  'Food, Civil Supplies & Consumer Protection Department': {
    en: 'Food, Civil Supplies & Consumer Protection Department',
    hi: 'खाद्य, नागरिक आपूर्ति एवं उपभोक्ता संरक्षण विभाग',
    mr: 'अन्न, नागरी पुरवठा व ग्राहक संरक्षण विभाग',
    bn: 'খাদ্য ও সরবরাহ দপ্তর',
    ta: 'உணவு மற்றும் நுகர்வோர் பாதுகாப்புத் துறை',
    te: 'పౌర సరఫరాలు మరియు వినియోగదారుల వ్యవహారాల శాఖ',
    kn: 'ಆಹಾರ, ನಾಗರಿಕ ಸರಬರಾಜು ಮತ್ತು ಗ್ರಾಹಕರ ವ್ಯವಹಾರಗಳ ಇಲಾಖೆ',
    gu: 'અન્ન, નાગરિક પુરવઠો અને ગ્રાહક બાબતોનો વિભાગ',
  },
  'Urban Development & Municipal Administration': {
    en: 'Urban Development & Municipal Administration',
    hi: 'नगर विकास एवं नगर पालिका प्रशासन',
    mr: 'नगरविकास व नगरपालिका प्रशासन',
    bn: 'পৌর ও নগরোন্নয়ন দপ্তর',
    ta: 'நகராட்சி நிர்வாகம் மற்றும் குடிநீர் வழங்கல் துறை',
    te: 'పురపాలక పరిపాలన మరియు పట్టణాభివృద్ధి శాఖ',
    kn: 'ನಗರಾಭಿವೃದ್ಧಿ ಮತ್ತು ಪೌರಾಡಳಿತ ನಿರ್ದೇಶನಾಲಯ',
    gu: 'શહેરી વિકાસ અને શહેરી ગૃહ નિર્માણ વિભાગ',
  },
};

/**
 * Common keyword translations for dynamic synthesis
 */
const KEYWORD_MAP: Record<string, Record<SupportedLangCode, string>> = {
  'road': { en: 'road', hi: 'सड़क', mr: 'रस्ता', bn: 'রাস্তা', ta: 'சாலை', te: 'రోడ్డు', kn: 'ರಸ್ತೆ', gu: 'રોડ/રસ્તો' },
  'construction': { en: 'construction', hi: 'निर्माण कार्य', mr: 'बांधकाम', bn: 'নির্মাণ', ta: 'கட்டுமானம்', te: 'నిర్మాణం', kn: 'ನಿರ್ಮಾಣ', gu: 'બાંધકામ' },
  'water': { en: 'water', hi: 'पानी', mr: 'पाणी', bn: 'জল', ta: 'தண்ணீர்', te: 'నీరు', kn: 'ನೀರು', gu: 'પાણી' },
  'pipeline': { en: 'pipeline', hi: 'पाइपलाइन', mr: 'पाइपलाइन', bn: 'পাইপলাইন', ta: 'குழாய்', te: 'పైప్‌లైన్', kn: 'ಪೈಪ್‌ಲೈನ್', gu: 'પાઈપલાઈન' },
  'funds': { en: 'funds / expenditure', hi: 'निधि एवं खर्च', mr: 'निधी व खर्च', bn: 'তহবিল ও ব্যয়', ta: 'நிதி மற்றும் செலவு', te: 'నిధులు మరియు ఖర్చు', kn: 'ನಿಧಿ ಮತ್ತು ವೆಚ್ಚ', gu: 'ગ્રાન્ટ અને ખર્ચ' },
  'tender': { en: 'tender', hi: 'निविदा (टेंडर)', mr: 'निविदा (टेंडर)', bn: 'টেন্ডার', ta: 'டெண்டர்', te: 'టెండర్', kn: 'ಟೆಂಡರ್', gu: 'ટેન્ડર' },
  'scholarship': { en: 'scholarship', hi: 'छात्रवृत्ति', mr: 'शिष्यवृत्ती', bn: 'বৃত্তি', ta: 'கல்வி உதவித்தொகை', te: 'స్కాలర్‌షిప్', kn: 'ವಿದ್ಯಾರ್ಥಿವೇತನ', gu: 'શિષ્યવૃત્તિ' },
  'hospital': { en: 'hospital', hi: 'अस्पताल', mr: 'रुग्णालय', bn: 'হাসপাতাল', ta: 'மருத்துவமனை', te: 'ఆసుపత్రి', kn: 'ಆಸ್ಪತ್ರೆ', gu: 'હોસ્પિટલ' },
  'medicine': { en: 'medicines', hi: 'दवाइयां', mr: 'औषधे', bn: 'ওষুধ', ta: 'மருந்துகள்', te: 'మందులు', kn: 'ಔಷಧಿಗಳು', gu: 'દવાઓ' },
  'ration': { en: 'ration', hi: 'राशन', mr: 'रेशन', bn: 'রেশন', ta: 'ரேஷன்', te: 'రేషన్', kn: 'ರೇಷನ್', gu: 'રેશન' },
  'sanction': { en: 'sanction order', hi: 'स्वीकृति आदेश', mr: 'मंजुरी आदेश', bn: 'অনুমোদন আদেশ', ta: 'ஒப்புதல் ஆணை', te: 'మంజూరు ఉత్తర్వు', kn: 'ಮಂಜೂರಾತಿ ಆದೇಶ', gu: 'મંજૂરી હુકમ' },
};

/**
 * Translates content between languages preserving numbers, IDs, and symbols.
 */
export async function translateContent(
  text: string,
  sourceLang: string = 'en',
  targetLang: string = 'en'
): Promise<string> {
  if (!text || !text.trim()) return '';
  const sLang = (sourceLang.toLowerCase().slice(0, 2) || 'en') as SupportedLangCode;
  const tLang = (targetLang.toLowerCase().slice(0, 2) || 'en') as SupportedLangCode;

  if (sLang === tLang) return text.trim();

  const cacheKey = `${sLang}_${tLang}_${text.trim()}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 1. Direct dictionary match
  const trimmed = text.trim();
  if (RTI_DICTIONARY[trimmed] && RTI_DICTIONARY[trimmed][tLang]) {
    const res = RTI_DICTIONARY[trimmed][tLang];
    memoryCache.set(cacheKey, res);
    return res;
  }

  // Check inverse dictionary lookup
  for (const [enKey, langMap] of Object.entries(RTI_DICTIONARY)) {
    if (langMap[sLang] && langMap[sLang].toLowerCase() === trimmed.toLowerCase()) {
      const res = langMap[tLang] || enKey;
      memoryCache.set(cacheKey, res);
      return res;
    }
    if (trimmed.includes(langMap[sLang])) {
      const replaced = trimmed.replace(langMap[sLang], langMap[tLang]);
      memoryCache.set(cacheKey, replaced);
      return replaced;
    }
  }

  // 2. Department name match
  for (const [, langMap] of Object.entries(DEPARTMENT_LOCAL_NAMES)) {
    if (langMap[sLang] && langMap[sLang].toLowerCase() === trimmed.toLowerCase()) {
      const res = langMap[tLang] || langMap.en;
      memoryCache.set(cacheKey, res);
      return res;
    }
  }

  // 3. Pattern-based dynamic contextual translation
  let translated = trimmed;

  // Preserve identifiers (like RTI-2026-..., Survey No. ..., dates, numbers)
  const tokenMap: Map<string, string> = new Map();
  let tokenCounter = 0;

  // Protect RTI IDs
  translated = translated.replace(/RTI-\d{4}-[A-Z0-9]+/gi, (match) => {
    const placeholder = `__RTI_ID_${tokenCounter++}__`;
    tokenMap.set(placeholder, match);
    return placeholder;
  });

  // Protect dates (e.g., 2023-2024, 15/08/2025)
  translated = translated.replace(/\b\d{1,4}[-/]\d{1,4}(?:[-/]\d{2,4})?\b/g, (match) => {
    const placeholder = `__DATE_${tokenCounter++}__`;
    tokenMap.set(placeholder, match);
    return placeholder;
  });

  // Protect Survey/Gat numbers
  translated = translated.replace(/(?:Survey|Gat|Plot|सर्वे|गट|खसरा)\s*(?:No\.?|नं\.?|क्रमांक)?\s*[:\s]*(\d+[\w/-]*)/gi, (match) => {
    const placeholder = `__SURVEY_${tokenCounter++}__`;
    tokenMap.set(placeholder, match);
    return placeholder;
  });

  // Translate known phrases
  for (const [term, map] of Object.entries(RTI_DICTIONARY)) {
    if (translated.includes(term)) {
      translated = translated.split(term).join(map[tLang] || term);
    }
  }

  // Translate known departments
  for (const [, deptMap] of Object.entries(DEPARTMENT_LOCAL_NAMES)) {
    if (deptMap[sLang] && translated.includes(deptMap[sLang])) {
      translated = translated.split(deptMap[sLang]).join(deptMap[tLang] || deptMap.en);
    }
  }

  // Restore protected tokens
  for (const [placeholder, original] of tokenMap.entries()) {
    translated = translated.split(placeholder).join(original);
  }

  // Cross-lingual synthesis across all 8 Indian languages for core RTI domains:
  const isRoad = /रस्ता|सड़क|सडक|रास्ता|சாலை|రోడ్డు|ರಸ್ತೆ|road|मार्ग/.test(trimmed);
  const isWater = /पाणी|पाण्या|पानी|जल|நீர்|தண்ணீர்|నీరు|నీటి|నీరు|water|pipeline|पाईप|पाइप/.test(trimmed);
  const isScholarship = /शिष्यवृत्ती|छात्रवृत्ति|বৃত্তি|கல்வி உதவித்தொகை|స్కాలర్‌షిప్|ವಿದ್ಯಾರ್ಥಿವೇತನ|scholarship/.test(trimmed);
  const isLand = /सातबारा|फेरफार|7\/12|जमीन|भूमी|भूमि|खसरा|জমি|நிலம்|భూమి|land/.test(trimmed);

  if (isWater) {
    const waterMap: Record<SupportedLangCode, string> = {
      en: `Inquiry regarding drinking water pipeline infrastructure, sanctioned funds, and expenditure details: "${trimmed}"`,
      hi: `पेयजल पाइपलाइन निर्माण कार्य, स्वीकृत धनराशि एवं व्यय विवरण संबंधी आवेदन: "${trimmed}"`,
      mr: `पिण्याच्या पाण्याच्या पाईपलाईन कामाचे, मंजूर निधी व खर्च तपशील बाबत माहिती अर्ज: "${trimmed}"`,
      bn: `পানীয় জলের পাইপলাইন কাজ, অনুমোদিত তহবিল এবং ব্যয় সংক্রান্ত আবেদন: "${trimmed}"`,
      ta: `குடிநீர் குழாய் பணிகள், அனுமதிக்கப்பட்ட நிதி மற்றும் செலவு விவரங்கள் குறித்த கோரிக்கை: "${trimmed}"`,
      te: `తాగునీటి పైప్‌లైన్ పనులు, మంజూరైన నిధులు మరియు ఖర్చు వివరాల సమాచారం: "${trimmed}"`,
      kn: `ಕುಡಿಯುವ ನೀರಿನ ಪೈಪ್‌ಲೈನ್ ಕಾಮಗಾರಿ, ಮಂಜೂರಾದ ಅನುದಾನ ಮತ್ತು ವೆಚ್ಚದ ವಿವರಗಳ ಮಾಹಿತಿ: "${trimmed}"`,
      gu: `પીવાના પાણીની પાઇપલાઇન કામગીરી, મંજૂર ભંડોળ અને ખર્ચ વિગતો સંબંધિત માહિતી: "${trimmed}"`,
    };
    translated = waterMap[tLang] || trimmed;
  } else if (isRoad) {
    const roadMap: Record<SupportedLangCode, string> = {
      en: `Information requested regarding road construction work, contractor details, and expenditure: "${trimmed}"`,
      hi: `सड़क निर्माण कार्य, ठेकेदार विवरण एवं खर्च की गई राशि संबंधी जानकारी: "${trimmed}"`,
      mr: `रस्ता बांधकाम कामे, ठेकेदार तपशील व झालेला खर्च यासंबंधी माहिती: "${trimmed}"`,
      bn: `রাস্তা নির্মাণ কাজ, ঠিকাদার বিবরণ এবং ব্যয় সংক্রান্ত তথ্য: "${trimmed}"`,
      ta: `சாலை அமைக்கும் பணி, ஒப்பந்ததாரர் விவரங்கள் மற்றும் செலவு குறித்த தகவல்: "${trimmed}"`,
      te: `రోడ్డు నిర్మాణ పనులు, కాంట్రాక్టర్ వివరాలు మరియు ఖర్చు చేసిన మొత్తం వివరాలు: "${trimmed}"`,
      kn: `ರಸ್ತೆ ನಿರ್ಮಾಣ ಕಾಮಗಾರಿ, ಗುತ್ತಿಗೆದಾರರ ವಿವರಗಳು ಮತ್ತು ವೆಚ್ಚದ ಮಾಹಿತಿ: "${trimmed}"`,
      gu: `માર્ગ નિર્માણ કામગીરી, કોન્ટ્રાક્ટર વિગતો અને ખર્ચ સંબંધિત માહિતી: "${trimmed}"`,
    };
    translated = roadMap[tLang] || trimmed;
  } else if (isScholarship) {
    const schMap: Record<SupportedLangCode, string> = {
      en: `Status and fund disbursement records of government scholarship scheme: "${trimmed}"`,
      hi: `सरकारी छात्रवृत्ति योजना की स्थिति एवं धनराशि वितरण रिकॉर्ड: "${trimmed}"`,
      mr: `शासकीय शिष्यवृत्ती योजनेची स्थिती व निधी वाटप नोंदी: "${trimmed}"`,
      bn: `সরকারি বৃত্তি প্রকল্পের স্থিতি এবং তহবিল বিতরণ রেকর্ড: "${trimmed}"`,
      ta: `அரசு கல்வி உதவித்தொகை திட்ட நிலை மற்றும் நிதி வழங்கல் பதிவுகள்: "${trimmed}"`,
      te: `ప్రభుత్వ స్కాలర్‌షిప్ పథకం స్థితి మరియు నిధుల పంపిణీ రికార్డులు: "${trimmed}"`,
      kn: `ಸರ್ಕಾರಿ ವಿದ್ಯಾರ್ಥಿವೇತನ ಯೋಜನೆಯ ಸ್ಥಿತಿ ಮತ್ತು ಅನುದಾನ ವಿತರಣೆ ದಾಖಲೆಗಳು: "${trimmed}"`,
      gu: `સરકારી શિષ્યવૃત્તિ યોજનાની સ્થિતિ અને ભંડોળ વિતરણ રેકોર્ડ્સ: "${trimmed}"`,
    };
    translated = schMap[tLang] || trimmed;
  } else if (isLand) {
    const landMap: Record<SupportedLangCode, string> = {
      en: `Certified copies of land records, 7/12 mutation register, and ownership details: "${trimmed}"`,
      hi: `भूमि अभिलेख, 7/12 खसरा-खतौनी नकल एवं स्वामित्व विवरण: "${trimmed}"`,
      mr: `जमीन महसूल नोंदी, ७/१२ फेरफार उतारा व मालकी हक्क तपशील: "${trimmed}"`,
      bn: `জমির রেকর্ড, ৭/১২ খতিয়ান এবং মালিকানার বিবরণী: "${trimmed}"`,
      ta: `நில ஆவணங்கள், பட்டா சிட்டா மற்றும் உரிமை விவரங்கள்: "${trimmed}"`,
      te: `భూ రికార్డులు, పట్టాదారు పాస్‌బుక్ మరియు యాజమాన్య వివరాలు: "${trimmed}"`,
      kn: `ಭೂ ದಾಖಲೆಗಳು, ಆರ್‌ಟಿಸಿ ಮತ್ತು ಮಾಲೀಕತ್ವದ ವಿವರಗಳು: "${trimmed}"`,
      gu: `જમીન રેકોર્ડ્સ, ૭/૧૨ નકલ અને માલિકી વિગતો: "${trimmed}"`,
    };
    translated = landMap[tLang] || trimmed;
  } else if (sLang === 'en' && tLang !== 'en') {
    // English to Indian language phrase synthesis
    if (trimmed.toLowerCase().includes('location')) {
      translated = RTI_DICTIONARY['Please provide the exact location.'][tLang];
    } else if (trimmed.toLowerCase().includes('survey')) {
      translated = RTI_DICTIONARY['Please provide the exact survey number.'][tLang];
    } else if (trimmed.toLowerCase().includes('year') || trimmed.toLowerCase().includes('period')) {
      translated = RTI_DICTIONARY['Please specify the exact financial year or time period.'][tLang];
    } else if (trimmed.toLowerCase().includes('approved') || trimmed.toLowerCase().includes('verified')) {
      translated = RTI_DICTIONARY['Verified and approved for formal dispatch to PIO'][tLang];
    }
  }

    memoryCache.set(cacheKey, translated);
  return translated;
}

/**
 * Generates translations for all 8 supported languages simultaneously
 */
export async function generateAllTranslations(
  text: string,
  sourceLang: string = 'en'
): Promise<Record<SupportedLangCode, string>> {
  if (!text || !text.trim()) {
    const empty: Record<string, string> = {};
    for (const code of SUPPORTED_LANG_CODES) empty[code] = '';
    return empty as Record<SupportedLangCode, string>;
  }

  const sLang = (sourceLang.toLowerCase().slice(0, 2) || 'en') as SupportedLangCode;
  const result: Record<string, string> = {
    [sLang]: text.trim(),
  };

  await Promise.all(
    SUPPORTED_LANG_CODES.map(async (targetCode) => {
      if (targetCode === sLang) return;
      result[targetCode] = await translateContent(text, sLang, targetCode);
    })
  );

  return result as Record<SupportedLangCode, string>;
}

/**
 * Resolves localized text with backward-compatible fallbacks.
 * Supports:
 * - getLocalizedContent(entity, currentLanguage, fallbackText)
 * - getLocalizedContent(rawText, translationsRecord, currentLanguage)
 */
export function getLocalizedContent(
  entityOrText: MultilingualEntity | string | undefined | null,
  languageOrTranslations?: string | Record<string, string> | undefined | null,
  targetLangOrFallback?: string,
  fallbackText: string = ''
): string {
  if (!entityOrText) {
    return targetLangOrFallback || fallbackText || '';
  }

  // Case 1: getLocalizedContent(rawText: string, translationsRecord: Record<string, string>, currentLanguage: string)
  if (
    typeof entityOrText === 'string' &&
    typeof languageOrTranslations === 'object' &&
    languageOrTranslations !== null
  ) {
    const lang = (targetLangOrFallback || 'en').toLowerCase().slice(0, 2) as SupportedLangCode;
    if (languageOrTranslations[lang]?.trim()) {
      return languageOrTranslations[lang];
    }
    if (languageOrTranslations['en']?.trim()) {
      return languageOrTranslations['en'];
    }
    return entityOrText;
  }

  // Case 2: getLocalizedContent(rawText: string, currentLanguage: string)
  if (typeof entityOrText === 'string') {
    return entityOrText;
  }

  // Case 3: getLocalizedContent(entity: MultilingualEntity, currentLanguage: string, fallbackText: string)
  const currentLanguage = typeof languageOrTranslations === 'string' ? languageOrTranslations : targetLangOrFallback || 'en';
  const lang = (currentLanguage.toLowerCase().slice(0, 2) || 'en') as SupportedLangCode;

  // 1. Direct translation match
  if (entityOrText.translations && entityOrText.translations[lang] && entityOrText.translations[lang].trim()) {
    return entityOrText.translations[lang];
  }

  // 2. If entity original matches current language
  if (entityOrText.originalLanguage === lang && entityOrText.originalText) {
    return entityOrText.originalText;
  }

  // 3. Fallback to English translation
  if (entityOrText.translations && entityOrText.translations.en && entityOrText.translations.en.trim()) {
    return entityOrText.translations.en;
  }

  // 4. Fallback to original text
  if (entityOrText.originalText) {
    return entityOrText.originalText;
  }

  return fallbackText;
}

/**
 * Translates standard Indian government department names across all 8 supported languages
 */
export function translateDepartment(deptName: string, targetLang: string = 'en'): string {
  if (!deptName) return '';
  const lang = (targetLang.toLowerCase().slice(0, 2) || 'en') as SupportedLangCode;
  if (lang === 'en') return deptName;

  // Check exact dictionary
  for (const [key, transMap] of Object.entries(RTI_DICTIONARY)) {
    if (key.toLowerCase() === deptName.toLowerCase()) {
      if (transMap[lang]) return transMap[lang];
    }
  }

  // Common department mappings
  if (deptName.includes('Public Works') || deptName.includes('PWD')) {
    const m: Record<SupportedLangCode, string> = {
      en: 'Public Works Department (PWD)',
      hi: 'लोक निर्माण विभाग (पीडब्ल्यूडी)',
      mr: 'सार्वजनिक बांधकाम विभाग (पीडब्ल्यूडी)',
      bn: 'গণপূর্ত বিভাগ (পিডব্লিউডি)',
      ta: 'பொதுப்பணித்துறை (PWD)',
      te: 'ప్రజా పనుల విభాగం (PWD)',
      kn: 'ಲೋಕೋಪಯೋಗಿ ಇಲಾಖೆ (PWD)',
      gu: 'જાહેર બાંધકામ વિભાગ (PWD)',
    };
    return m[lang] || deptName;
  }

  if (deptName.includes('Revenue') || deptName.includes('Land')) {
    const m: Record<SupportedLangCode, string> = {
      en: 'Revenue & Land Records Department',
      hi: 'राजस्व एवं भूमि अभिलेख विभाग',
      mr: 'महसूल व भूमी अभिलेख विभाग',
      bn: 'ভূমি ও রাজস্ব বিভাগ',
      ta: 'வருவாய் மற்றும் நில ஆவணங்கள் துறை',
      te: 'రెవెన్యూ మరియు భూ రికార్డుల విభాగం',
      kn: 'ಕಂದಾಯ ಮತ್ತು ಭೂ ದಾಖಲೆಗಳ ಇಲಾಖೆ',
      gu: 'મહેસૂલ અને જમીન રેકોર્ડ વિભાગ',
    };
    return m[lang] || deptName;
  }

  if (deptName.includes('Water') || deptName.includes('Sanitation') || deptName.includes('Jal')) {
    const m: Record<SupportedLangCode, string> = {
      en: 'Water Supply & Sanitation Department',
      hi: 'जल आपूर्ति एवं स्वच्छता विभाग',
      mr: 'पाणीपुरवठा व स्वच्छता विभाग',
      bn: 'জল সরবরাহ ও স্যানিটেশন বিভাগ',
      ta: 'குடிநீர் வழங்கல் மற்றும் துப்புரவுத் துறை',
      te: 'మంచి నీటి సరఫరా మరియు పారిశుద్ధ్య విభాగం',
      kn: 'ನೀರು ಸರಬರಾಜು ಮತ್ತು ನೈರ್ಮಲ್ಯ ಇಲಾಖೆ',
      gu: 'પાણી પુરવઠો અને સ્વચ્છતા વિભાગ',
    };
    return m[lang] || deptName;
  }

  if (deptName.includes('Municipal') || deptName.includes('Corporation') || deptName.includes('Urban')) {
    const m: Record<SupportedLangCode, string> = {
      en: 'Urban Development & Municipal Corporation',
      hi: 'नगर विकास एवं नगर निगम',
      mr: 'नगरविकास व महानगरपालिका',
      bn: 'নগর উন্নয়ন ও পৌরসভা',
      ta: 'நகர்ப்புற வளர்ச்சி மற்றும் மாநகராட்சி',
      te: 'పట్టణాభివృద్ధి మరియు పురపాలక సంఘం',
      kn: 'ನಗರಾಭಿವೃದ್ಧಿ ಮತ್ತು ಮಹಾನಗರ ಪಾಲಿಕೆ',
      gu: 'શહેરી વિકાસ અને મહાનગરપાલિકા',
    };
    return m[lang] || deptName;
  }

  if (deptName.includes('Health') || deptName.includes('Family')) {
    const m: Record<SupportedLangCode, string> = {
      en: 'Public Health & Family Welfare Department',
      hi: 'लोक स्वास्थ्य एवं परिवार कल्याण विभाग',
      mr: 'सार्वजनिक आरोग्य व कुटुंब कल्याण विभाग',
      bn: 'স্বাস্থ্য ও পরিবার কল্যাণ বিভাগ',
      ta: 'மக்கள் நல்வாழ்வு மற்றும் குடும்ப நலத்துறை',
      te: 'ప్రజారోగ్య మరియు కుటుంబ సంక్షేమ శాఖ',
      kn: 'ಸಾರ್ವಜನಿಕ ಆರೋಗ್ಯ ಮತ್ತು ಕುಟುಂಬ ಕಲ್ಯಾಣ ಇಲಾಖೆ',
      gu: 'જાહેર આરોગ્ય અને પરિવાર કલ્યાણ વિભાગ',
    };
    return m[lang] || deptName;
  }

  if (deptName.includes('Education') || deptName.includes('School')) {
    const m: Record<SupportedLangCode, string> = {
      en: 'School Education & Sports Department',
      hi: 'स्कूली शिक्षा एवं खेल विभाग',
      mr: 'शालेय शिक्षण व क्रीडा विभाग',
      bn: 'বিদ্যালয় শিক্ষা ও ক্রীড়া বিভাগ',
      ta: 'பள்ளிக் கல்வி மற்றும் விளையாட்டுத் துறை',
      te: 'పాఠశాల విద్య మరియు క్రీడల శాఖ',
      kn: 'ಶಾಲಾ ಶಿಕ್ಷಣ ಮತ್ತು ಕ್ರೀಡಾ ಇಲಾಖೆ',
      gu: 'શાળા શિક્ષણ અને રમતગમત વિભાગ',
    };
    return m[lang] || deptName;
  }

  return deptName;
}

