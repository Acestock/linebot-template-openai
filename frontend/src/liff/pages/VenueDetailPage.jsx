import React, { useState, useEffect } from 'react';
import { fetchVenue } from '../api';

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #f0f0f0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 16px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          background: 'none', border: 'none', fontSize: '15px',
          fontWeight: '500', cursor: 'pointer', textAlign: 'left'
        }}
      >
        {title}
        <span style={{ fontSize: '18px', color: '#888' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', fontSize: '14px', color: '#555', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
          {children}
        </div>
      )}
    </div>
  );
}

const SLOT_MAP = {
  morning: { label: '早上', icon: '🌅', range: '07–12' },
  afternoon: { label: '下午', icon: '☀️', range: '12–18' },
  evening: { label: '晚上', icon: '🌙', range: '18–02' }
};

export default function VenueDetailPage({ venueId, onReserve, onWalkIn }) {
  const [venue, setVenue] = useState(null);
  const [plansOpen, setPlansOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVenue(venueId).then(setVenue).catch(() => {}).finally(() => setLoading(false));
  }, [venueId]);

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>載入中...</div>;
  if (!venue)  return <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>場地不存在</div>;

  const singlePlans = (venue.plans || []).filter(p => p.type === 'single');
  const multiPlans  = (venue.plans || []).filter(p => p.type === 'multi');
  const activeAnnouncements = (venue.announcements || []).filter(a => a.isActive);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
      {/* Hero image */}
      {venue.imageUrl ? (
        <img src={venue.imageUrl} alt={venue.name} style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '160px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🏢</div>
      )}

      {/* Announcements */}
      {activeAnnouncements.length > 0 && (
        <div style={{ background: '#fff8e1', padding: '10px 16px', borderLeft: '4px solid #f9a825' }}>
          {activeAnnouncements.map(a => (
            <div key={a._id} style={{ fontSize: '13px', color: '#5d4037', marginBottom: '4px' }}>
              <strong>{a.title}</strong>{a.content ? '：' + a.content : ''}
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '16px' }}>
        {/* Name */}
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>{venue.name}</div>

        {/* Info */}
        {venue.transportInfo && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px', color: '#555' }}>
            <span>ℹ️</span><span>{venue.transportInfo}</span>
          </div>
        )}
        {venue.address && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px', color: '#555' }}>
            <span>📍</span><span>{venue.address}</span>
          </div>
        )}
        {venue.businessHours && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '14px', color: '#555' }}>
            <span>🕐</span><span style={{ whiteSpace: 'pre-line' }}>{venue.businessHours}</span>
          </div>
        )}

        {/* Pricing */}
        {(singlePlans.length > 0 || multiPlans.length > 0) && (
          <div style={{ border: '1px solid #eee', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
            <button
              onClick={() => setPlansOpen(o => !o)}
              style={{
                width: '100%', padding: '14px 16px', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                background: '#fafafa', border: 'none', fontSize: '15px',
                fontWeight: '600', cursor: 'pointer'
              }}
            >
              方案價目表 <span>{plansOpen ? '−' : '+'}</span>
            </button>
            {plansOpen && (
              <div style={{ padding: '12px 16px' }}>
                {singlePlans.length > 0 && (
                  <>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#888', marginBottom: '8px' }}>單時段方案</div>
                    {singlePlans.map(p => {
                      const slotKey = p.slots?.[0];
                      const info = SLOT_MAP[slotKey] || {};
                      return (
                        <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f5f5f5' }}>
                          <span style={{ fontSize: '14px', color: '#444' }}>
                            {info.icon || ''} {p.name || `${info.label} ${info.range}`}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>${p.price}</span>
                        </div>
                      );
                    })}
                  </>
                )}
                {multiPlans.length > 0 && (
                  <>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#888', marginTop: '12px', marginBottom: '8px' }}>多時段方案</div>
                    {multiPlans.map(p => (
                      <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <span style={{ fontSize: '14px', color: '#444' }}>{p.name}</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>${p.price}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Accordion sections */}
        <div style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', marginBottom: '80px' }}>
          {venue.facilities && <Accordion title="設備與服務">{venue.facilities}</Accordion>}
          {venue.rules      && <Accordion title="使用規範">{venue.rules}</Accordion>}
          {venue.howToUse   && <Accordion title="使用方式">{venue.howToUse}</Accordion>}
        </div>
      </div>

      {/* Fixed bottom buttons */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 16px', background: '#fff',
        borderTop: '1px solid #f0f0f0', display: 'flex', gap: '10px'
      }}>
        <button
          onClick={() => onWalkIn(venue)}
          style={{
            flex: 1, padding: '14px', borderRadius: '10px',
            border: '1.5px solid var(--brand-border)', background: 'var(--brand-light)',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer', color: 'var(--brand-text)'
          }}
        >立即入場</button>
        <button
          onClick={() => onReserve(venue)}
          style={{
            flex: 1, padding: '14px', borderRadius: '10px',
            border: 'none', background: 'var(--brand-color)',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer', color: 'var(--brand-text)'
          }}
        >預約入場</button>
      </div>
    </div>
  );
}
