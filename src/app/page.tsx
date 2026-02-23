import { MansionCanvas } from '@/components/MansionCanvas'

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <h1 style={{
        fontFamily: 'monospace',
        fontSize: '2rem',
        letterSpacing: '0.3em',
        marginBottom: '1rem',
        color: '#dfe6e9',
        textTransform: 'uppercase',
      }}>
        Haunt
      </h1>
      <p style={{
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        color: '#b2bec3',
        marginBottom: '2rem',
      }}>
        your ghost databases, alive
      </p>
      <MansionCanvas />
    </main>
  )
}
