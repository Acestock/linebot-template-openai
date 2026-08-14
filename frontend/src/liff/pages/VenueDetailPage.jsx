import React, { useState, useEffect, useRef } from 'react';
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
  morning:   { label: '早上', icon: '🌅', range: '07–12' },
  afternoon: { label: '下午', icon: '☀️', range: '12–18' },
  evening:   { label: '晚上', icon: '🌙', range: '18–02' }
};

// Inline SVG icons (no external dependency)
const IconLocation = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="8"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
  </svg>
);

// Auto-sliding image carousel
function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  function startTimer() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx(i => (i + 1) % images.length);
    }, 3500);
  }

  useEffect(() => {
    if (images.length > 1) startTimer();
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div style={{ width: '100%', height: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🏢</div>
    );
  }

  if (images.length === 1) {
    return <img src={images[0]} alt="" style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }} />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden' }}>
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: i === idx ? 1 : 0,
            transition: 'opacity 0.6s ease'
          }}
        />
      ))}
      {/* Dot indicators */}
      <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); startTimer(); }}
            style={{
              width: i === idx ? '18px' : '7px', height: '7px',
              borderRadius: '4px', border: 'none', padding: 0,
              background: i === idx ? '#fff' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer', transition: 'all 0.3s'
            }}
          />
        ))}
      </div>
    </div>
  );
}

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

  // Collect all images: imageUrls array takes priority, fallback to imageUrl
  const images = (venue.imageUrls && venue.imageUrls.length > 0)
    ? venue.imageUrls
    : (venue.imageUrl ? [venue.imageUrl] : []);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
      {/* Hero image carousel */}
      <ImageCarousel images={images} />

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
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px', color: '#555', alignItems: 'flex-start' }}>
            <IconInfo /><span>{venue.transportInfo}</span>
          </div>
        )}
        {venue.address && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px', color: '#555', alignItems: 'flex-start' }}>
            <IconLocation /><span>{venue.address}</span>
          </div>
        )}
        {venue.businessHours && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '14px', color: '#555', alignItems: 'flex-start' }}>
            <IconClock /><span style={{ whiteSpace: 'pre-line' }}>{venue.businessHours}</span>
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
