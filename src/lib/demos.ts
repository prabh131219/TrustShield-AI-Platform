import type { ScanInput } from '@/types';

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  expected: string;
  input: ScanInput;
}

export const demoScenarios: DemoScenario[] = [
  {
    id: 'suspicious',
    title: 'Suspicious Vendor Change',
    description: 'Known vendor but new bank/UPI details with an urgent request. The primary judge demo: VERIFY → Hold → trusted callback challenge → signed Decision Passport.',
    expected: 'VERIFY',
    input: {
      qrPayload: '',
      upiId: 'vendor-new@upi',
      messageText: 'URGENT: Our bank account changed yesterday. The pending invoice is due now. Please use the new UPI immediately. Do not inform anyone else.',
      url: '',
      receiverKnown: 'known',
      paymentAmount: '8500',
      detailsChanged: true,
    },
  },
  {
    id: 'safe',
    title: 'Safe Payment',
    description: 'Verified receiver, normal message and approved UPI ID.',
    expected: 'TRUST',
    input: {
      qrPayload: '',
      upiId: 'mother@okhdfcbank',
      messageText: 'Hi beta, please send the usual amount for groceries this month.',
      url: '',
      receiverKnown: 'known',
      paymentAmount: '2500',
      detailsChanged: false,
    },
  },
  {
    id: 'scam',
    title: 'High-Risk Scam',
    description: 'Unknown receiver, urgent money request and suspicious link.',
    expected: 'STOP',
    input: {
      qrPayload: '',
      upiId: 'reward-centre@xyz',
      messageText: 'URGENT! You have won a reward. Pay processing fee now to claim. Act now or it expires. Don\'t tell anyone. Click: http://reward-centre.xyz/claim',
      url: 'http://reward-centre.xyz/claim',
      receiverKnown: 'unknown',
      paymentAmount: '499',
      detailsChanged: false,
    },
  },
];
