'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
}

export default function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <label className="adm-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="toggle-track" />
      <div className="toggle-thumb" />
    </label>
  );
}
