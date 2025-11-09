import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { User } from '../types';
import { 
    VirtualPhotoshootIcon, AssetGeneratorIcon, ProductForgeIcon, StyleSceneIcon,
    GalleryIcon, PricingIcon, SettingsIcon, HelpIcon, LogoutIcon
} from './icons';
import { PATHS } from '../constants/paths';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onHelpClick: () => void;
  isCollapsed: boolean;
  closeMobileSidebar: () => void;
}

const NavItem: React.FC<{
    to: string;
    icon: React.ReactElement;
    label: string;
    isCollapsed: boolean;
    onClick?: () => void;
}> = ({ to, icon, label, isCollapsed, onClick }) => {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            title={label}
            className={({ isActive }) => `relative group w-full flex items-center py-3 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                isActive
                ? 'bg-[#9F1D35]/10 text-[#9F1D35]'
                : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
            } ${isCollapsed ? 'justify-center' : 'px-4'}`}
        >
            <div className={`w-6 h-6 ${!isCollapsed ? 'mr-4' : ''}`}>{icon}</div>
            {!isCollapsed && <span className="truncate">{label}</span>}
            {isCollapsed && (
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
                    {label}
                </div>
            )}
        </NavLink>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, onHelpClick, isCollapsed, closeMobileSidebar }) => {
    const coreFeatures = [
        { path: PATHS.VIRTUAL_PHOTOSHOOT, icon: <VirtualPhotoshootIcon />, label: 'Virtual Photoshoot' },
        { path: PATHS.STYLE_SCENE, icon: <StyleSceneIcon />, label: 'StyleScene' },
        { path: PATHS.ASSET_GENERATOR, icon: <AssetGeneratorIcon />, label: 'Asset Generator' },
        { path: PATHS.CATALOG_FORGED, icon: <ProductForgeIcon />, label: 'Catalog Forged' },
    ];
    
    const utilityNav = [
        { path: PATHS.GALLERY, icon: <GalleryIcon />, label: 'My Gallery' },
        { path: PATHS.ASSET_COLLECTION, icon: <AssetGeneratorIcon />, label: 'Asset Collection' },
        { path: PATHS.PRICING, icon: <PricingIcon />, label: 'Pricing & Usage' },
        { path: PATHS.SETTINGS, icon: <SettingsIcon />, label: 'Settings' },
    ];

    const handleHelpClick = () => {
        onHelpClick();
        closeMobileSidebar();
    };

    return (
        <aside className={`flex-shrink-0 bg-gray-100/70 border-r border-gray-200/80 flex flex-col p-4 h-full transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <Link 
              to={PATHS.HOME}
              onClick={closeMobileSidebar}
              className={`text-2xl font-bold font-headline text-[#2E1E1E] mb-8 px-2 h-8 flex items-center cursor-pointer ${isCollapsed ? 'justify-center' : ''}`} 
            >
                {!isCollapsed ? (
                    <span className="truncate">ZOLA AI</span>
                ) : (
                    <div className="w-8 h-8"><VirtualPhotoshootIcon /></div>
                )}
            </Link>
            
            <nav className="flex-grow space-y-1">
                {!isCollapsed && <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Features</p>}
                {coreFeatures.map(item => (
                    <NavItem key={item.path} to={item.path} isCollapsed={isCollapsed} onClick={closeMobileSidebar} {...item} />
                ))}

                <div className={`${isCollapsed ? 'mt-4' : 'pt-6'}`}>
                    {!isCollapsed && <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tools</p>}
                    {utilityNav.map(item => (
                       <NavItem key={item.path} to={item.path} isCollapsed={isCollapsed} onClick={closeMobileSidebar} {...item} />
                    ))}
                    <button
                        onClick={handleHelpClick}
                        title="Help / Tour"
                        className={`relative group w-full flex items-center py-3 text-sm font-semibold rounded-lg transition-colors duration-200 text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 ${isCollapsed ? 'justify-center' : 'px-4'}`}
                    >
                        <div className={`w-6 h-6 ${!isCollapsed ? 'mr-4' : ''}`}><HelpIcon /></div>
                        {!isCollapsed && <span className="truncate">Help / Tour</span>}
                        {isCollapsed && (
                            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
                                Help / Tour
                            </div>
                        )}
                    </button>
                </div>
            </nav>

            <div className="mt-auto">
                <div className="p-2 border-t border-gray-200">
                    <div className={`flex items-center ${isCollapsed ? 'flex-col' : ''}`}>
                        <div className="relative group">
                            {user.avatar && (
                                <img 
                                    src={user.avatar} 
                                    alt="User avatar" 
                                    className="w-10 h-10 rounded-full" 
                                    title={isCollapsed ? user.username : undefined}
                                />
                            )}
                            {isCollapsed && user.avatar && (
                                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
                                    {user.username}
                                </div>
                            )}
                        </div>

                        {!isCollapsed && (
                            <div className="ml-3">
                                <p className="text-sm font-bold text-gray-800">{user.username}</p>
                                <button
                                    onClick={onLogout}
                                    className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center"
                                >
                                    <div className="w-3 h-3 mr-1"><LogoutIcon /></div>
                                    Logout
                                </button>
                            </div>
                        )}
                        
                        {isCollapsed && (
                            <button 
                                onClick={onLogout} 
                                title="Logout" 
                                className="relative group mt-3 text-gray-600 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"
                            >
                                <div className="w-5 h-5"><LogoutIcon /></div>
                                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
                                    Logout
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
