// src/AppHeader.js

import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function AppHeader({ title, handleLogout, onBack }) {
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 4 }}>
      <Toolbar>
        {onBack && (
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mr: 2 }}>
            Back
          </Button>
        )}
        <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          {title}
        </Typography>
        <Button color="inherit" endIcon={<LogoutIcon />} onClick={handleLogout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default AppHeader;
