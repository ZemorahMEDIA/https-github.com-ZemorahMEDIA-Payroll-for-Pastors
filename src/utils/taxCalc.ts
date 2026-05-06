import { TaxConfig, TaxResult, PAY_PERIODS } from '../types';

// 2025 Estimated Tax Brackets (Quebec)
const QC_BRACKETS = [
  { threshold: 0, rate: 0.14 },
  { threshold: 52260, rate: 0.19 },
  { threshold: 104505, rate: 0.24 },
  { threshold: 127150, rate: 0.2575 }
];

// 2025 Estimated Tax Brackets (Federal)
const FED_BRACKETS = [
  { threshold: 0, rate: 0.15 },
  { threshold: 57375, rate: 0.205 },
  { threshold: 114750, rate: 0.26 },
  { threshold: 177922, rate: 0.29 },
  { threshold: 246752, rate: 0.33 }
];

const QC_BASIC_PERSONAL_AMOUNT = 18500;
const FED_BASIC_PERSONAL_AMOUNT = 16215;
const FED_CANADA_EMPLOYMENT_AMOUNT = 1433;

// QPP 2025
const QPP_RATE = 0.064; // Employee portion (12.8% total)
const QPP_EXEMPTION = 3500;
const QPP_MAX_EARNINGS = 71300;
const QPP2_RATE = 0.04; 
const QPP2_MAX_EARNINGS = 81200;

// QPIP 2025
const QPIP_RATE = 0.00494;
const QPIP_EMPLOYER_RATE = 0.00692;
const QPIP_MAX_EARNINGS = 97000;

// EI 2025 (Quebec rates are lower than rest of Canada due to QPIP)
const EI_RATE = 0.0131;
const EI_EMPLOYER_MULTIPLIER = 1.4;
const EI_MAX_EARNINGS = 65700;

// Quebec Health Services Fund (FSS) - Standard small employer rate
const HSF_RATE = 0.0125; 

function calculateProgressiveTax(income: number, brackets: { threshold: number; rate: number }[]): number {
  let tax = 0;
  let remainingIncome = income;
  for (let i = brackets.length - 1; i >= 0; i--) {
    const { threshold, rate } = brackets[i];
    if (remainingIncome > threshold) {
      const taxableAtThisRate = remainingIncome - threshold;
      tax += taxableAtThisRate * rate;
      remainingIncome = threshold;
    }
  }
  return tax;
}

/**
 * Simplified RAMQ calculation for Quebec residents
 * Scales from $0 at $18,500 to ~$731 at ~$50,000 net income
 */
function calculateRAMQ(netIncome: number): number {
  if (netIncome <= 18500) return 0;
  const maxRAMQ = 731;
  const ramq = (netIncome - 18500) * 0.05; // Simplified scaling
  return Math.min(ramq, maxRAMQ);
}

export function calculateTax(config: TaxConfig): TaxResult {
  const periods = PAY_PERIODS[config.payFrequency];
  const annualGross = config.grossIncome * (config.payFrequency === 'annually' ? 1 : periods);
  
  // 1. Clergy Residence Deduction (CRD)
  let annualCRD = 0;
  if (config.hasClergyDeduction) {
    const housingValue = config.housingFMV + config.utilities;
    const annualHousingValue = housingValue * (config.payFrequency === 'annually' ? 1 : periods);
    const crdLimit = Math.max(10000, annualGross / 3);
    annualCRD = Math.min(annualHousingValue, crdLimit);
  }
  
  const taxableIncome = Math.max(0, annualGross - annualCRD);
  
  // 2. Federal Tax
  let federalTax = calculateProgressiveTax(taxableIncome, FED_BRACKETS);
  // Non-refundable credits (Personal + Employment)
  const fedCredits = (FED_BASIC_PERSONAL_AMOUNT + FED_CANADA_EMPLOYMENT_AMOUNT) * 0.15;
  federalTax = Math.max(0, federalTax - fedCredits);

  // Apply Quebec Tax Abatement (16.5% reduction for Quebec residents)
  federalTax = federalTax * 0.835;
  
  // 3. Provincial Tax (Quebec)
  let provincialTax = calculateProgressiveTax(taxableIncome, QC_BRACKETS);
  const qcCredits = QC_BASIC_PERSONAL_AMOUNT * 0.14;
  provincialTax = Math.max(0, provincialTax - qcCredits);
  
  // Add RAMQ (Health Insurance)
  const ramq = calculateRAMQ(annualGross);
  provincialTax += ramq;
  
  // 4. QPP (Quebec Pension Plan)
  const pensionableEarnings = Math.min(annualGross, QPP_MAX_EARNINGS) - QPP_EXEMPTION;
  let annualQPP = Math.max(0, pensionableEarnings * QPP_RATE);
  let annualQPPEmployer = Math.max(0, pensionableEarnings * QPP_RATE); // Matches employee
  
  // QPP2 (Enhancement)
  if (annualGross > QPP_MAX_EARNINGS) {
    const qpp2Earnings = Math.min(annualGross, QPP2_MAX_EARNINGS) - QPP_MAX_EARNINGS;
    annualQPP += qpp2Earnings * QPP2_RATE;
    annualQPPEmployer += qpp2Earnings * QPP2_RATE;
  }
  
  // 5. QPIP
  const annualQPIP = Math.min(annualGross, QPIP_MAX_EARNINGS) * QPIP_RATE;
  const annualQPPIPEmployer = Math.min(annualGross, QPIP_MAX_EARNINGS) * QPIP_EMPLOYER_RATE;
  
  // 6. EI
  const annualEI = Math.min(annualGross, EI_MAX_EARNINGS) * EI_RATE;
  const annualEIEmployer = annualEI * EI_EMPLOYER_MULTIPLIER;
  
  // 7. HSF (Health Services Fund - Employer only)
  const annualHSFEmployer = annualGross * HSF_RATE;
  
  const totalFederalDeductions = federalTax + annualEI;
  const totalProvincialDeductions = provincialTax + annualQPP + annualQPIP;
  const totalAnnualDeductions = totalFederalDeductions + totalProvincialDeductions;
  
  const totalEmployerContributions = annualQPPEmployer + annualQPPIPEmployer + annualEIEmployer + annualHSFEmployer;
  
  // Scale back to period
  const scale = (config.payFrequency === 'annually' ? 1 : periods);
  
  return {
    grossIncome: config.grossIncome,
    clergyResidenceDeduction: annualCRD / scale,
    taxableIncome: taxableIncome / scale,
    federalTax: federalTax / scale,
    provincialTax: provincialTax / scale,
    qpp: annualQPP / scale,
    qpip: annualQPIP / scale,
    ei: annualEI / scale,
    totalFederalDeductions: totalFederalDeductions / scale,
    totalProvincialDeductions: totalProvincialDeductions / scale,
    totalDeductions: totalAnnualDeductions / scale,
    netPay: config.grossIncome - (totalAnnualDeductions / scale),
    qppEmployer: annualQPPEmployer / scale,
    qpipEmployer: annualQPPIPEmployer / scale,
    eiEmployer: annualEIEmployer / scale,
    hsfEmployer: annualHSFEmployer / scale,
    totalEmployerContributions: totalEmployerContributions / scale
  };
}
