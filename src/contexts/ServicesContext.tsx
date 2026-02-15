import React, { createContext, useContext } from "react";
import {
  createApiService,
  walletManagementSvc,
  createWebSocketService,
  tvsWebSocket,
  storageService,
  StorageService,
  adminSvc,
  analyticsSvc,
  RBACService,
  ReportsService,
} from "../services";

interface ServicesContextType {
  walletMgmtSvc: ReturnType<typeof createApiService>;
  adminSvc: ReturnType<typeof createApiService>;
  analyticsSvc: ReturnType<typeof createApiService>;
  tvsWebSocket: ReturnType<typeof createWebSocketService>;
  storageSvc: StorageService;
  rbacSvc: RBACService;
  reportsSvc: ReportsService;
}

const ServicesContext = createContext<ServicesContextType | undefined>(
  undefined,
);

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const services: ServicesContextType = {
    walletMgmtSvc: walletManagementSvc,
    tvsWebSocket,
    storageSvc: storageService,
    adminSvc,
    analyticsSvc,
    rbacSvc: new RBACService(adminSvc),
    reportsSvc: new ReportsService(adminSvc),
  };

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = (): ServicesContextType => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error("useServices must be used within a ServicesProvider");
  }
  return context;
};
