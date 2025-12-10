import React, { useState } from 'react';
import type { IConnectionConfig } from './useAgentService.js';
import style from './ChatPanel.module.css';
import { useS } from '@cloudbeaver/core-blocks';

interface ConnectionFormProps {
  config: IConnectionConfig;
  onSave: (config: IConnectionConfig) => void;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({ config, onSave }) => {
  const styles = useS(style);
  const [formData, setFormData] = useState<IConnectionConfig>(config);

  React.useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Partial<IConnectionConfig>) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form className={styles['connectionForm']} onSubmit={handleSubmit}>
      <div className={styles['formGroup']}>
        <label>Model:</label>
        <input
          name="model"
          value={formData.model || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
      <div className={styles['formGroup']}>
        <label>Embed Model:</label>
        <input
          name="embed_model"
          value={formData.embed_model || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
      <div className={styles['formGroup']}>
        <label>
          <input
            type="checkbox"
            name="is_ollama"
            checked={!!formData.is_ollama}
            onChange={(e) => setFormData(prev => ({ ...prev, is_ollama: e.target.checked }))}
          />
          Is Ollama
        </label>
      </div>
       <div className={styles['formGroup']}>
        <label>Memgraph URL:</label>
        <input
          name="memgraph_url"
          value={formData.memgraph_url || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
      <div className={styles['formGroup']}>
        <label>Memgraph User:</label>
        <input
          name="memgraph_user"
          value={formData.memgraph_user || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
       <div className={styles['formGroup']}>
        <label>Memgraph Password:</label>
        <input
          type="password"
          autoComplete="off"
          name="memgraph_password"
          value={formData.memgraph_password || ''}
          onChange={handleChange}
          className={styles['formInput']}
        />
      </div>
      <div className={styles['formGroup']}>
        <label>Database Type:</label>
        <input
          name="db_type"
          value={formData.db_type || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
      <div className={styles['formGroup']}>
        <label>Database URL:</label>
        <input
          name="db_url"
          value={formData.db_url || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
      <div className={styles['formGroup']}>
        <label>Host:</label>
        <input
          name="db_host"
          value={formData.db_host || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
       <div className={styles['formGroup']}>
        <label>Port:</label>
        <input
          name="db_port"
          value={formData.db_port || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
      <div className={styles['formGroup']}>
        <label>Database Name:</label>
        <input
          name="db_name"
          value={formData.db_name || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
      <div className={styles['formGroup']}>
        <label>Username:</label>
        <input
            name="db_user"
            value={formData.db_user || ''}
            onChange={handleChange}
            className={styles['formInput']}
            required
        />
      </div>
      <div className={styles['formGroup']}>
        <label>Password:</label>
        <input
          type="password"
          name="db_password"
          value={formData.db_password || ''}
          onChange={handleChange}
          className={styles['formInput']}
          required
        />
      </div>
      <button type="submit" className={styles['formButton']}>Save Configuration</button>
    </form>
  );
};
