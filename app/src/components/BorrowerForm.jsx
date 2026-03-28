import { useState, useEffect } from 'react'

const GRADES      = ['A','B','C','D','E','F','G']
const PURPOSES    = ['debt_consolidation','credit_card','home_improvement',
                     'major_purchase','small_business','medical','other']
const OWNERSHIPS  = ['RENT','OWN','MORTGAGE']
const EMP_LENGTHS = ['< 1 year','1 year','2 years','3 years','4 years',
                     '5 years','6 years','7 years','8 years','9 years','10+ years']

function SectionLabel({ children }) {
  return (
    <p className="font-mono text-2xs uppercase tracking-widest text-text-muted mt-3 mb-1.5 first:mt-0">
      {children}
    </p>
  )
}

function FieldLabel({ children }) {
  return (
    <span className="font-mono text-xs text-text-muted">
      {children}
    </span>
  )
}

function SliderField({ label, value, min, max, step = 1, format, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <FieldLabel>{label}</FieldLabel>
        <span className="font-mono text-xs text-text-primary">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-surface border border-border text-sm text-text-primary px-2 py-1.5 font-sans w-full"
        style={{ borderRadius: 4 }}
      >
        {options.map(o => (
          <option key={String(o)} value={String(o)}>{String(o)}</option>
        ))}
      </select>
    </div>
  )
}

export default function BorrowerForm({ defaults, onChange }) {
  const [form, setForm] = useState(defaults || {})

  useEffect(() => {
    if (defaults && Object.keys(defaults).length) setForm(defaults)
  }, [JSON.stringify(defaults)])

  function update(key, value) {
    const next = { ...form, [key]: value }
    setForm(next)
    onChange?.(next)
  }

  return (
    <div className="flex flex-col px-4 py-4 gap-2 overflow-y-auto h-full">

      <SectionLabel>Loan Details</SectionLabel>
      <SelectField
        label="Grade" value={form.grade || 'C'} options={GRADES}
        onChange={v => update('grade', v)}
      />
      <SelectField
        label="Term (months)" value={form.term || 36} options={[36, 60]}
        onChange={v => update('term', parseInt(v))}
      />
      <SliderField
        label="Loan Amount" value={form.loan_amnt || 10000}
        min={1000} max={40000} step={500}
        format={v => `$${Number(v).toLocaleString()}`}
        onChange={v => update('loan_amnt', v)}
      />
      <SliderField
        label="Interest Rate" value={form.int_rate || 13}
        min={5} max={30} step={0.1}
        format={v => `${Number(v).toFixed(1)}%`}
        onChange={v => update('int_rate', v)}
      />

      <SectionLabel>Borrower Profile</SectionLabel>
      <SliderField
        label="Annual Income" value={form.annual_inc || 65000}
        min={10000} max={300000} step={1000}
        format={v => `$${(v / 1000).toFixed(0)}k`}
        onChange={v => update('annual_inc', v)}
      />
      <SliderField
        label="DTI" value={form.dti || 18}
        min={0} max={50} step={0.5}
        format={v => `${Number(v).toFixed(1)}%`}
        onChange={v => update('dti', v)}
      />
      <SelectField
        label="Employment Length" value={form.emp_length || '5 years'}
        options={EMP_LENGTHS}
        onChange={v => update('emp_length', v)}
      />
      <SelectField
        label="Home Ownership" value={form.home_ownership || 'RENT'}
        options={OWNERSHIPS}
        onChange={v => update('home_ownership', v)}
      />
      <SelectField
        label="Purpose" value={form.purpose || 'debt_consolidation'}
        options={PURPOSES}
        onChange={v => update('purpose', v)}
      />

      <SectionLabel>Credit History</SectionLabel>
      <SliderField
        label="FICO Score" value={form.fico_range_low || 685}
        min={580} max={850} step={1}
        format={v => Math.round(v)}
        onChange={v => { update('fico_range_low', v); update('fico_range_high', v + 4) }}
      />
      <SliderField
        label="Revolving Utilization" value={form.revol_util || 55}
        min={0} max={100} step={1}
        format={v => `${Math.round(v)}%`}
        onChange={v => update('revol_util', v)}
      />
      <SliderField
        label="Revolving Balance" value={form.revol_bal || 8000}
        min={0} max={100000} step={500}
        format={v => `$${Number(v).toLocaleString()}`}
        onChange={v => update('revol_bal', v)}
      />
      <SliderField
        label="Open Accounts" value={form.open_acc || 9}
        min={1} max={30} step={1}
        format={v => Math.round(v)}
        onChange={v => update('open_acc', v)}
      />

    </div>
  )
}
