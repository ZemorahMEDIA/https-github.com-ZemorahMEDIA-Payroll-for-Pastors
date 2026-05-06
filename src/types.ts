export interface TaxResult {
  grossIncome: number;
  clergyResidenceDeduction: number;
  taxableIncome: number;
  federalTax: number;
  provincialTax: number;
  qpp: number;
  qpip: number;
  ei: number;
  totalFederalDeductions: number;
  totalProvincialDeductions: number;
  totalDeductions: number;
  netPay: number;
  qppEmployer: number;
  qpipEmployer: number;
  eiEmployer: number;
  hsfEmployer: number;
  totalEmployerContributions: number;
}

export interface PayslipRecord {
  id: string;
  dateCreated: string;
  config: TaxConfig;
  results: TaxResult;
}

export interface ClientProfile {
  employeeName: string;
  employeeSIN: string;
  employeeAddress: string;
  history: PayslipRecord[];
}

export interface TaxConfig {
  grossIncome: number;
  housingFMV: number;
  utilities: number;
  payFrequency: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'annually';
  employeeName: string;
  employeeSIN: string;
  employeeAddress: string;
  payrollYear: number;
  payrollMonth: string;
  hasClergyDeduction: boolean;
}

export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const YEARS = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 6 + i);

export const PAY_PERIODS = {
  weekly: 52,
  'bi-weekly': 26,
  'semi-monthly': 24,
  monthly: 12,
  annually: 1
};
