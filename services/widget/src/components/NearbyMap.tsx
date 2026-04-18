import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { API_BASE_URL } from '../lib/constants';

// Fix typical Leaflet icon paths in React bundle
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Custom Icons based on severity
const getIcon = (score: number) => {
  const color = score >= 60 ? 'red' : score >= 30 ? 'orange' : 'green';
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

interface NearbyPin {
  id: string;
  latitude: number;
  longitude: number;
  priority_score: number;
  category: string;
  severity: number;
  reports_count: number;
}

interface NearbyMapProps {
  latitude: number;
  longitude: number;
  onMeTooSuccess: () => void;
}

const CenterMap = ({ lat, lon }: { lat: number; lon: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 15);
  }, [lat, lon, map]);
  return null;
};

export default function NearbyMap({ latitude, longitude, onMeTooSuccess }: NearbyMapProps) {
  const [pins, setPins] = useState<NearbyPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNearby = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/complaints/nearby?lat=${latitude}&lon=${longitude}&radius=2000`);
        const data = await res.json();
        if (data.pins) {
          setPins(data.pins);
        }
      } catch (err) {
        console.error("Failed to fetch nearby complaints", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNearby();
  }, [latitude, longitude]);

  const handleMeToo = async (publicId: string) => {
    setVotingId(publicId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/complaints/${publicId}/metoo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: latitude, lon: longitude })
      });
      const data = await res.json();
      if (data.success) {
        alert("Thanks! We've added your vote and bumped the priority of this issue.");
        onMeTooSuccess(); // Let parent know we're done
      } else {
        alert("Failed to submit support.");
      }
    } catch (e) {
      alert("Error submitting support.");
    } finally {
      setVotingId(null);
    }
  };

  if (loading) {
    return <div className="w-full h-48 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-sm text-gray-500">Loading nearby map...</div>;
  }

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border bg-gray-50 relative z-0">
      <MapContainer center={[latitude, longitude]} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterMap lat={latitude} lon={longitude} />
        
        {/* User's own location (Blue dot) */}
        <Marker position={[latitude, longitude]}>
          <Popup>You are here</Popup>
        </Marker>

        {/* Existing Complaints */}
        {pins.map((p) => (
          <Marker 
            key={p.id} 
            position={[p.latitude, p.longitude]} 
            icon={getIcon(p.priority_score)}
          >
            <Popup>
              <div className="text-center font-sans">
                <p className="font-bold mb-1 uppercase text-xs">{p.category}</p>
                <p className="text-xs text-gray-600 mb-2">Priority: {p.priority_score} | Reports: {p.reports_count}</p>
                <button
                  disabled={votingId === p.id}
                  onClick={() => handleMeToo(p.id)}
                  className="bg-blue-600 text-white w-full rounded text-xs py-1.5 font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {votingId === p.id ? "Submitting..." : "👍 Me Too!"}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
