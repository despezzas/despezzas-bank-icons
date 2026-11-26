// Só checagem de tipos (tsc --noEmit).
import { useRef } from 'react';
import { NubankLogo, BancoDoBrasilLogo, type BankLogo } from '@despezzas/bank-icons';
import { bankLogos, bankCatalog, findBankLogo, type BankSlug } from '@despezzas/bank-icons/all';

export function Example({ name }: { name: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const slug: BankSlug = bankCatalog[0].slug;
  const Found: BankLogo = findBankLogo(name, { country: 'BR' }) ?? NubankLogo;
  const Any = bankLogos[slug];
  return (
    <div>
      <NubankLogo ref={ref} size={24} title="Nubank" className="rounded" onClick={() => {}} />
      <BancoDoBrasilLogo size="2rem" />
      <Found />
      <Any style={{ borderRadius: 8 }} />
    </div>
  );
}
