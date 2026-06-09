import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Button,
    Popper,
    Paper,
    MenuList,
    MenuItem as MuiMenuItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    Collapse,
    Divider,
    Typography,
    useTheme,
    useMediaQuery,
    alpha,
    Tooltip,
    Grow,
    ClickAwayListener,
} from '@mui/material';
import {
    Menu as MenuIcon,
    ExpandLess,
    ExpandMore,
    KeyboardArrowDown,
} from '@mui/icons-material';
import { useAuth } from '../../store';
import { usePermissionCheck } from '../../hooks/useRolePermissions';
import type { MenuItem } from './Sidebar';
import { menuItems, getVisibleMenuItems } from './Sidebar';

// EFF Brand Colors
const EFF_GREEN = '#055305';
const EFF_GREEN_LIGHT = '#2E7D2E';
const EFF_YELLOW = '#FFAB00';

// ─── Group definitions for the horizontal bar ────────────────────────────────

interface NavGroup {
    id: string;
    label: string;
    /** IDs of top-level menuItems that belong to this group */
    itemIds: string[];
}

const navGroups: NavGroup[] = [
    { id: 'dashboards', label: 'Dashboards', itemIds: ['dashboard', 'hierarchical-dashboard'] },
    { id: 'membership', label: 'Membership', itemIds: ['members', 'applications'] },
    { id: 'search', label: 'Search', itemIds: ['search'] },
    { id: 'org', label: 'Leadership & Meetings', itemIds: ['leadership', 'meetings'] },
    { id: 'comms', label: 'Communication', itemIds: ['sms', 'whatsapp'] },
    { id: 'finance', label: 'Finance', itemIds: ['financial-dashboard', 'financial-transactions'] },
    { id: 'analytics', label: 'Analytics', itemIds: ['analytics'] },
    { id: 'audit', label: 'Audit & Compliance', itemIds: ['ward-audit', 'delegates-management', 'self-data-management', 'audit'] },
    { id: 'admin', label: 'Administration', itemIds: ['users', 'admin-management', 'mfa-emergency-access', 'super-admin', 'system', 'profile'] },
];

// ─── Component ───────────────────────────────────────────────────────────────

const HorizontalNav: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { permissions } = usePermissionCheck();

    // Track which group is open + button refs for Popper anchoring
    const [openGroupId, setOpenGroupId] = useState<string | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Mobile drawer
    const [mobileOpen, setMobileOpen] = useState(false);
    // Mobile collapsible sections
    const [openSections, setOpenSections] = useState<string[]>([]);

    const visibleItems = getVisibleMenuItems(menuItems, permissions, user);

    // Build a lookup map: id → MenuItem
    const itemMap = new Map<string, MenuItem>();
    visibleItems.forEach(item => itemMap.set(item.id, item));

    // Flatten a MenuItem (which may have children) into a list of leaf items for the dropdown
    const flattenItem = (item: MenuItem): MenuItem[] => {
        if (item.children && item.children.length > 0) {
            return item.children;
        }
        return [item];
    };

    // ── hover handlers ──
    const handleOpenGroup = useCallback((groupId: string) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setOpenGroupId(groupId);
    }, []);

    const handleCloseGroup = useCallback(() => {
        closeTimerRef.current = setTimeout(() => {
            setOpenGroupId(null);
        }, 200);
    }, []);

    const handleNavigate = (path: string, groupId?: string) => {
        navigate(path);
        setOpenGroupId(null);
        setMobileOpen(false);
    };

    const isPathActive = (path?: string) => path ? location.pathname === path : false;
    const isGroupActive = (group: NavGroup) => {
        return group.itemIds.some(id => {
            const item = itemMap.get(id);
            if (!item) return false;
            if (item.path && isPathActive(item.path)) return true;
            if (item.children) return item.children.some(c => c.path && isPathActive(c.path));
            return false;
        });
    };

    // ── visible groups (only show groups with at least one visible item) ──
    const visibleGroups = navGroups.filter(g =>
        g.itemIds.some(id => itemMap.has(id))
    );

    // ─── DESKTOP HORIZONTAL BAR ────────────────────────────────────────────────
    const renderDesktop = () => (
        <ClickAwayListener onClickAway={() => setOpenGroupId(null)}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    px: 1,
                    py: 0.5,
                    overflowX: 'auto',
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    borderBottom: `2px solid ${alpha(EFF_YELLOW, 0.4)}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    minHeight: 46,
                    '&::-webkit-scrollbar': { height: 4 },
                    '&::-webkit-scrollbar-thumb': { background: alpha('#FFFFFF', 0.3), borderRadius: 2 },
                }}
            >
                {visibleGroups.map(group => {
                    const active = isGroupActive(group);
                    const open = openGroupId === group.id;

                    // Collect leaf items for this group
                    const leafItems: MenuItem[] = [];
                    group.itemIds.forEach(id => {
                        const item = itemMap.get(id);
                        if (item) leafItems.push(...flattenItem(item));
                    });

                    // If only one leaf, render as a direct button (no dropdown)
                    if (leafItems.length === 1 && leafItems[0].path) {
                        const only = leafItems[0];
                        return (
                            <Tooltip key={group.id} title={only.label} arrow>
                                <Button
                                    size="small"
                                    onClick={() => handleNavigate(only.path!)}
                                    startIcon={only.icon}
                                    sx={{
                                        color: active ? '#FFF' : alpha('#FFF', 0.9),
                                        backgroundColor: active ? EFF_GREEN : 'transparent',
                                        fontWeight: active ? 700 : 500,
                                        fontSize: '0.8rem',
                                        textTransform: 'none',
                                        borderRadius: '8px',
                                        px: 1.5,
                                        py: 0.6,
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.25s ease',
                                        boxShadow: active ? `0 2px 8px ${alpha(EFF_GREEN, 0.35)}` : 'none',
                                        '&:hover': {
                                            backgroundColor: EFF_GREEN,
                                            color: '#FFF',
                                            transform: 'translateY(-1px)',
                                        },
                                    }}
                                >
                                    {group.label}
                                </Button>
                            </Tooltip>
                        );
                    }

                    // Multi-item group: hover to open dropdown
                    return (
                        <Box
                            key={group.id}
                            onMouseEnter={() => handleOpenGroup(group.id)}
                            onMouseLeave={handleCloseGroup}
                            sx={{ position: 'relative' }}
                        >
                            <Button
                                ref={(el) => { buttonRefs.current[group.id] = el; }}
                                size="small"
                                onClick={() => open ? setOpenGroupId(null) : handleOpenGroup(group.id)}
                                endIcon={<KeyboardArrowDown sx={{ fontSize: '1rem !important', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />}
                                sx={{
                                    color: (active || open) ? '#FFF' : alpha('#FFF', 0.9),
                                    backgroundColor: (active || open) ? EFF_GREEN : 'transparent',
                                    fontWeight: active ? 700 : 500,
                                    fontSize: '0.8rem',
                                    textTransform: 'none',
                                    borderRadius: '8px',
                                    px: 1.5,
                                    py: 0.6,
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.25s ease',
                                    boxShadow: active ? `0 2px 8px ${alpha(EFF_GREEN, 0.35)}` : 'none',
                                    '&:hover': {
                                        backgroundColor: EFF_GREEN,
                                        color: '#FFF',
                                    },
                                }}
                            >
                                {group.label}
                            </Button>
                            <Popper
                                open={open}
                                anchorEl={buttonRefs.current[group.id]}
                                placement="bottom-start"
                                transition
                                disablePortal={false}
                                modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
                                sx={{ zIndex: theme.zIndex.modal + 1 }}
                            >
                                {({ TransitionProps }) => (
                                    <Grow {...TransitionProps} style={{ transformOrigin: 'top left' }}>
                                        <Paper
                                            elevation={8}
                                            onMouseEnter={() => handleOpenGroup(group.id)}
                                            onMouseLeave={handleCloseGroup}
                                            sx={{
                                                borderRadius: '10px',
                                                minWidth: 240,
                                                background: EFF_GREEN,
                                                border: `1px solid ${EFF_GREEN_LIGHT}`,
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                                overflow: 'hidden',
                                                py: 0.5,
                                            }}
                                        >
                                            <MenuList autoFocusItem={false}>
                                                {leafItems.map(leaf => {
                                                    const leafActive = isPathActive(leaf.path);
                                                    return (
                                                        <MuiMenuItem
                                                            key={leaf.id}
                                                            onClick={() => leaf.path && handleNavigate(leaf.path, group.id)}
                                                            selected={leafActive}
                                                            sx={{
                                                                borderRadius: '6px',
                                                                mx: 0.5,
                                                                my: 0.25,
                                                                py: 1,
                                                                color: '#FFF',
                                                                transition: 'all 0.2s ease',
                                                                '&.Mui-selected': {
                                                                    backgroundColor: alpha(EFF_YELLOW, 0.25),
                                                                    '&:hover': {
                                                                        backgroundColor: EFF_YELLOW,
                                                                        color: '#FFF',
                                                                    },
                                                                },
                                                                '&:hover': {
                                                                    backgroundColor: EFF_YELLOW,
                                                                    color: '#FFF',
                                                                    '& .MuiListItemIcon-root': { color: '#FFF' },
                                                                },
                                                            }}
                                                        >
                                                            <ListItemIcon sx={{ minWidth: 36, color: leafActive ? EFF_YELLOW : alpha('#FFF', 0.8) }}>
                                                                {leaf.icon}
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary={leaf.label}
                                                                primaryTypographyProps={{
                                                                    fontSize: '0.875rem',
                                                                    fontWeight: leafActive ? 600 : 400,
                                                                    color: 'inherit',
                                                                }}
                                                            />
                                                        </MuiMenuItem>
                                                    );
                                                })}
                                            </MenuList>
                                        </Paper>
                                    </Grow>
                                )}
                            </Popper>
                        </Box>
                    );
                })}
            </Box>
        </ClickAwayListener>
    );

    // ─── MOBILE DRAWER ──────────────────────────────────────────────────────────
    const toggleSection = (id: string) => {
        setOpenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const renderMobileDrawer = () => (
        <>
            <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{
                    color: '#FFF',
                    bgcolor: alpha(EFF_YELLOW, 0.2),
                    border: `1px solid ${alpha(EFF_YELLOW, 0.4)}`,
                    borderRadius: 2,
                    '&:hover': { bgcolor: alpha(EFF_YELLOW, 0.35) },
                }}
                aria-label="open navigation menu"
            >
                <MenuIcon />
            </IconButton>
            <Drawer
                anchor="top"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                PaperProps={{
                    sx: {
                        maxHeight: '85vh',
                        background: `linear-gradient(180deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                        color: '#FFFFFF',
                        borderBottomLeftRadius: 16,
                        borderBottomRightRadius: 16,
                    },
                }}
            >
                <Box sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: EFF_YELLOW }}>
                            Navigation
                        </Typography>
                        <IconButton onClick={() => setMobileOpen(false)} sx={{ color: alpha('#FFF', 0.8) }}>
                            ✕
                        </IconButton>
                    </Box>
                    <Divider sx={{ borderColor: alpha('#FFF', 0.15), mb: 1 }} />
                    <List disablePadding>
                        {visibleGroups.map(group => {
                            const leafItems: MenuItem[] = [];
                            group.itemIds.forEach(id => {
                                const item = itemMap.get(id);
                                if (item) leafItems.push(...flattenItem(item));
                            });
                            const sectionOpen = openSections.includes(group.id);
                            const active = isGroupActive(group);

                            if (leafItems.length === 1 && leafItems[0].path) {
                                const only = leafItems[0];
                                return (
                                    <ListItem key={group.id} disablePadding>
                                        <ListItemButton
                                            onClick={() => handleNavigate(only.path!)}
                                            selected={isPathActive(only.path)}
                                            sx={{
                                                borderRadius: '10px', mx: 1, my: 0.25,
                                                '&.Mui-selected': { backgroundColor: alpha(EFF_YELLOW, 0.2) },
                                                '&:hover': { backgroundColor: alpha('#FFF', 0.08) },
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36, color: alpha('#FFF', 0.8) }}>{only.icon}</ListItemIcon>
                                            <ListItemText primary={group.label} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            }

                            return (
                                <React.Fragment key={group.id}>
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            onClick={() => toggleSection(group.id)}
                                            sx={{
                                                borderRadius: '10px', mx: 1, my: 0.25,
                                                backgroundColor: active ? alpha(EFF_YELLOW, 0.15) : 'transparent',
                                                '&:hover': { backgroundColor: alpha('#FFF', 0.08) },
                                            }}
                                        >
                                            <ListItemText
                                                primary={group.label}
                                                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: active ? 700 : 500, color: active ? EFF_YELLOW : '#FFF' }}
                                            />
                                            {sectionOpen ? <ExpandLess sx={{ color: alpha('#FFF', 0.7) }} /> : <ExpandMore sx={{ color: alpha('#FFF', 0.7) }} />}
                                        </ListItemButton>
                                    </ListItem>
                                    <Collapse in={sectionOpen} timeout="auto" unmountOnExit>
                                        <List disablePadding>
                                            {leafItems.map(leaf => (
                                                <ListItem key={leaf.id} disablePadding>
                                                    <ListItemButton
                                                        onClick={() => leaf.path && handleNavigate(leaf.path)}
                                                        selected={isPathActive(leaf.path)}
                                                        sx={{
                                                            pl: 4, borderRadius: '8px', mx: 1.5, my: 0.15,
                                                            '&.Mui-selected': { backgroundColor: alpha(EFF_YELLOW, 0.2), '& .MuiListItemIcon-root': { color: EFF_YELLOW } },
                                                            '&:hover': { backgroundColor: alpha('#FFF', 0.06) },
                                                        }}
                                                    >
                                                        <ListItemIcon sx={{ minWidth: 32, color: alpha('#FFF', 0.7) }}>{leaf.icon}</ListItemIcon>
                                                        <ListItemText primary={leaf.label} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isPathActive(leaf.path) ? 600 : 400 }} />
                                                    </ListItemButton>
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Collapse>
                                </React.Fragment>
                            );
                        })}
                    </List>
                </Box>
            </Drawer>
        </>
    );

    // ─── Render ─────────────────────────────────────────────────────────────────
    if (isMobile) return renderMobileDrawer();
    return renderDesktop();
};

export default HorizontalNav;
