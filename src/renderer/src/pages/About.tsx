import { Card } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

export default function About() {
  const { t } = useTranslation()

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 40 }}>
      <Card style={{ width: 480, textAlign: 'center' }}>
        <FileTextOutlined style={{ fontSize: 36, color: '#1677ff', marginBottom: 8 }} />
        <h1 style={{ margin: '0 0 2px 0', fontSize: 22, fontWeight: 700, color: '#1677ff' }}>Fatoora Pro</h1>
        <p style={{ color: '#888', margin: '0 0 4px 0', fontSize: 12 }}>{t('tagline')}</p>
        <p style={{ color: '#999', margin: '0 0 24px 0', fontSize: 12 }}>{t('version')} 1.0.0</p>

        <div style={{ textAlign: 'center', fontSize: 13, lineHeight: 2.2 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{t('developed_by')}</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Elbara Mouaffak</div>
          <div style={{ fontSize: 12, color: '#666' }}>AI Engineer &amp; Software Developer</div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>Electron · React · TypeScript · SQLite</div>
        </div>

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #f0f0f0', fontSize: 11, color: '#999' }}>
          &copy; 2026 Elbara Mouaffak. {t('all_rights')}.
        </div>
      </Card>
    </div>
  )
}
