import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './config';
import { DepartmentInfo } from '@/types';

export const DEFAULT_DEPARTMENTS: DepartmentInfo[] = [
  {
    departmentId: 'pwd',
    code: 'PWD',
    name: 'Public Works Department (PWD)',
    description: 'State highways, major arterial roads, state government infrastructure, bridge construction, government quarters and tender allocations.',
    domains: ['roads', 'highways', 'infrastructure', 'bridges', 'public buildings', 'tenders'],
    keywords: ['road construction', 'highway', 'tender', 'contractor', 'expenditure', 'state highway', 'flyover', 'potholes', 'tarmac'],
    jurisdictionNotes: 'State highways, Major District Roads (MDR), and government office buildings. Does NOT cover internal colony or municipal roads.',
    alternativeAuthorities: ['Municipal Corporation / Urban Local Bodies', 'Rural Development & Panchayati Raj'],
  },
  {
    departmentId: 'municipal',
    code: 'ULB-MC',
    name: 'Municipal Corporation / Urban Local Bodies',
    description: 'City administration, municipal roads, urban water supply, sewage, stormwater drains, building permissions, property tax, and local sanitation.',
    domains: ['urban civic', 'internal roads', 'drainage', 'drinking water', 'property tax', 'encroachment', 'garbage', 'sanitation'],
    keywords: ['ward', 'municipal road', 'water connection', 'drainage', 'sanitation', 'corporation', 'civic', 'garbage', 'street lights'],
    jurisdictionNotes: 'Internal roads and civic utilities within notified Municipal Corporation or Municipal Council limits.',
    alternativeAuthorities: ['Public Works Department (PWD)', 'Water Resources & Sanitation Department'],
  },
  {
    departmentId: 'water-res',
    code: 'WRD',
    name: 'Water Resources & Sanitation Department',
    description: 'Irrigation dams, canals, rural water supply schemes (Jal Jeevan Mission), groundwater regulation, flood control works.',
    domains: ['irrigation', 'canals', 'dams', 'rural water', 'sanitation schemes', 'groundwater'],
    keywords: ['canal', 'irrigation', 'dam', 'water supply pipeline', 'jal jeevan', 'lift irrigation', 'groundwater', 'borewell scheme'],
    jurisdictionNotes: 'Major state irrigation projects, reservoir storage, and inter-district bulk water pipelines.',
    alternativeAuthorities: ['Municipal Corporation / Urban Local Bodies', 'Rural Development & Panchayati Raj'],
  },
  {
    departmentId: 'rural-dev',
    code: 'RDPR',
    name: 'Rural Development & Panchayati Raj',
    description: 'Gram Panchayat administration, Zilla Parishad village roads, MGNREGA employment schemes, rural housing (PMAY-G).',
    domains: ['gram panchayat', 'rural works', 'mgnrega', 'village roads', 'panchayat samiti'],
    keywords: ['gram panchayat', 'sarpanch', 'village road', 'mgnrega', 'panchayat samiti', 'rural toilet', 'zilla parishad'],
    jurisdictionNotes: 'Works strictly within designated rural revenue village and Gram Panchayat jurisdictions.',
    alternativeAuthorities: ['Public Works Department (PWD)', 'Revenue & Land Records Department'],
  },
  {
    departmentId: 'revenue-land',
    code: 'REV',
    name: 'Revenue & Land Records Department',
    description: 'Land title records (7/12 extract, Khatiyan), demarcation, mutation entries, tehsildar orders, stamp duty & registration.',
    domains: ['land records', '7/12 extract', 'mutation', 'patwari', 'tehsildar', 'land acquisition', 'survey number'],
    keywords: ['gat number', 'survey number', '7/12', 'khatiyan', 'mutation entry', 'ferfar', 'tehsildar', 'patwari', 'land acquisition'],
    jurisdictionNotes: 'Land title verification, demarcation records, mutation disputes, and agricultural land administration.',
    alternativeAuthorities: ['Municipal Corporation / Urban Local Bodies', 'Rural Development & Panchayati Raj'],
  },
  {
    departmentId: 'education-school',
    code: 'SE&L',
    name: 'Department of School Education & Literacy',
    description: 'Primary and secondary government schools, teacher recruitment, mid-day meals, RTE admissions, infrastructure grants.',
    domains: ['schools', 'rte', 'teachers', 'mid-day meal', 'admissions', 'education'],
    keywords: ['government school', 'primary school', 'rte admission', 'mid day meal', 'teacher appointment', 'school grant'],
    jurisdictionNotes: 'Public primary, upper primary, and secondary schools under the state education board.',
    alternativeAuthorities: ['Department of Higher Education'],
  },
  {
    departmentId: 'health-family',
    code: 'H&FW',
    name: 'Health & Family Welfare Department',
    description: 'Government civil hospitals, primary health centres (PHC), medicine procurement, health schemes (PM-JAY, state insurance).',
    domains: ['hospitals', 'phc', 'medicine supply', 'doctors', 'civil surgeon', 'health schemes'],
    keywords: ['civil hospital', 'phc', 'medicine shortage', 'doctor attendance', 'ambulance', 'pm-jay', 'treatment funds'],
    jurisdictionNotes: 'District civil hospitals, sub-district hospitals, and rural Primary Health Centres (PHC).',
    alternativeAuthorities: ['Municipal Corporation / Urban Local Bodies'],
  },
  {
    departmentId: 'transport',
    code: 'RTO',
    name: 'Transport & Motor Vehicles Department',
    description: 'RTO vehicle registration, driving licenses, state transport bus operations, road safety permits, pollution testing centers.',
    domains: ['rto', 'driving license', 'vehicle registration', 'fitness certificate', 'msrtc', 'traffic permits'],
    keywords: ['rto', 'driving licence', 'rc book', 'vehicle transfer', 'permit', 'pollution certificate', 'bus route'],
    jurisdictionNotes: 'Regional Transport Offices (RTO), vehicle compliance, and state passenger transport corporations.',
    alternativeAuthorities: ['Home & Police Department'],
  },
];

class DepartmentService {
  private cachedDepartments: DepartmentInfo[] | null = null;

  public async getDepartments(): Promise<DepartmentInfo[]> {
    if (this.cachedDepartments && this.cachedDepartments.length > 0) {
      return this.cachedDepartments;
    }

    try {
      const snap = await getDocs(collection(db, 'departments'));
      if (!snap.empty) {
        this.cachedDepartments = snap.docs.map((d) => ({
          departmentId: d.id,
          ...d.data(),
        })) as DepartmentInfo[];
        return this.cachedDepartments;
      }
    } catch (err) {
      console.warn('Could not fetch departments from Firestore, using default catalog:', err);
    }

    this.cachedDepartments = DEFAULT_DEPARTMENTS;
    return this.cachedDepartments;
  }

  public async getDepartmentByName(name: string): Promise<DepartmentInfo | undefined> {
    const list = await this.getDepartments();
    return list.find((d) => d.name.toLowerCase() === name.toLowerCase() || d.code.toLowerCase() === name.toLowerCase());
  }
}

export const departmentService = new DepartmentService();
