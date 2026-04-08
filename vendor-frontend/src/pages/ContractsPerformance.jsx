import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, LinearProgress } from "@mui/material";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import DownloadIcon from "@mui/icons-material/Download";

export default function ContractsPerformance() {
  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="#1e293b" mb={1}>Contracts & Performance</Typography>
        <Typography color="text.secondary">Review compliance certificates and your performance scorecard.</Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3, borderRadius: 2 }}>
            <Typography variant="h6" mb={2}>Uploaded Documents & Compliance</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Document Type</TableCell>
                    <TableCell>Valid Until</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow hover>
                    <TableCell>ISO 9001 Certificate</TableCell>
                    <TableCell>2027-12-31</TableCell>
                    <TableCell align="right"><Button size="small" startIcon={<DownloadIcon />}>View</Button></TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>Master Service Agreement</TableCell>
                    <TableCell>2028-05-15</TableCell>
                    <TableCell align="right"><Button size="small" startIcon={<DownloadIcon />}>View</Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box border="1px dashed #cbd5e1" borderRadius={1} p={3} mt={3} textAlign="center" sx={{ cursor: 'pointer', bgcolor: '#f8fafc' }}>
               <FileUploadIcon color="primary" />
               <Typography variant="body2" color="primary" fontWeight={600}>Upload New Certificate</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3, borderRadius: 2 }}>
            <Typography variant="h6" mb={2}>Supplier Scorecard (YTD)</Typography>
            
            <Box mb={3}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" fontWeight={600}>Contract performance</Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">94%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={94} color="success" sx={{ height: 8, borderRadius: 4 }} />
            </Box>

            <Box mb={3}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" fontWeight={600}>Quality Conformity</Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">98%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={98} color="success" sx={{ height: 8, borderRadius: 4 }} />
            </Box>
            
            <Box mb={3}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" fontWeight={600}>Invoice Accuracy</Typography>
                <Typography variant="body2" fontWeight={600} color="warning.main">82%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={82} color="warning" sx={{ height: 8, borderRadius: 4 }} />
            </Box>

          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
