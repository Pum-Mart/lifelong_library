'use client';
import { createContext, useContext } from 'react';
export const StaffCtx = createContext(null);
export const useStaff = () => useContext(StaffCtx);
