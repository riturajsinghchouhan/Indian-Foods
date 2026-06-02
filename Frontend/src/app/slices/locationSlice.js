import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isLocationResolved: false,
  coords: null, // { latitude, longitude }
  zoneId: null,
  address: null,
}

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation: (state, action) => {
      const { coords, zoneId, address } = action.payload;
      state.coords = coords;
      state.zoneId = zoneId;
      state.address = address;
      state.isLocationResolved = true;
      
      // Sync to local storage for axios interceptor
      if (zoneId) {
        localStorage.setItem('userZoneId', zoneId);
      }
      if (coords?.latitude && coords?.longitude) {
        localStorage.setItem('userLat', coords.latitude);
        localStorage.setItem('userLng', coords.longitude);
      }
    },
    clearLocation: (state) => {
      state.coords = null;
      state.zoneId = null;
      state.address = null;
      state.isLocationResolved = false;
      localStorage.removeItem('userZoneId');
      localStorage.removeItem('userLat');
      localStorage.removeItem('userLng');
    }
  },
})

export const { setLocation, clearLocation } = locationSlice.actions
export default locationSlice.reducer
