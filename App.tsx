
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AdminGenerator from './pages/generators/AdminGenerator';
import QuestionBankGenerator from './pages/generators/QuestionBankGenerator';
import PesantrenBankGenerator from './pages/generators/PesantrenBankGenerator';
import ECourseGenerator from './pages/generators/ECourseGenerator';
import Results from './pages/Results';
import ImageLab from './pages/ai-lab/ImageLab';
import VideoLab from './pages/ai-lab/VideoLab';
import AudioLab from './pages/ai-lab/AudioLab';