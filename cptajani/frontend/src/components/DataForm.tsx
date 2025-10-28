import React, { useState } from 'react';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  defaultValue?: any;
}

interface DataFormProps {
  title: string;
  fields: Field[];
  onSubmit: (data: any) => void;
}

export default function DataForm({ title, fields, onSubmit }: DataFormProps) {
  const [formData, setFormData] = useState(() => {
    const initialData: any = {};
    fields.forEach(field => {
      initialData[field.name] = field.defaultValue || '';
    });
    return initialData;
  });

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderField = (field: Field) => {
    switch (field.type) {
      case 'select':
        return (
          <select
            value={formData[field.name]}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          >
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            value={formData[field.name]}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={4}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={formData[field.name]}
            onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
            step="0.01"
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={formData[field.name]}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
        );
    }
  };

  return (
    <div className="data-form">
      <div className="form-header">
        <h3>{title}</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="form-content">
        {fields.map(field => (
          <div key={field.name} className="form-field">
            <label htmlFor={field.name}>{field.label}</label>
            {renderField(field)}
          </div>
        ))}
        
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            Submit Data
          </button>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => {
              const resetData: any = {};
              fields.forEach(field => {
                resetData[field.name] = field.defaultValue || '';
              });
              setFormData(resetData);
            }}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
