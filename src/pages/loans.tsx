'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function LoanManagement() {
  const [loans, setLoans] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [loading, setLoading] = useState({
    loans: true,
    installments: true
  });

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageTransactions, setCurrentPageTransactions] = useState(1);


  const [paymentData, setPaymentData] = useState({
    jumlah_angsuran: 0,
    custom_payment: false,
    pay_remaining: false
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      await Promise.all([fetchLoans(), fetchInstallments()]);
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      } else {
        console.log('An unknown error occurred:', error);
      }
    }
  }, []);

  const fetchLoans = async () => {
    setLoading(prev => ({ ...prev, loans: true }));
    const { data, error } = await supabase
      .from('pinjaman')
      .select(`
        *,
        biodata_anggota: id_anggota (nama_lengkap)
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setLoans(data);
    }
    setLoading(prev => ({ ...prev, loans: false }));
  };

  const fetchInstallments = async () => {
    setLoading(prev => ({ ...prev, installments: true }));
    const { data, error } = await supabase
      .from('angsuran')
      .select(`*,
                biodata_anggota: id_anggota (nama_lengkap)
      `)
      .order('create_at', { ascending: false });

    if (!error) {
      setInstallments(data);
    }
    setLoading(prev => ({ ...prev, installments: false }));
  };


  const handleApproveLoan = async () => {
    if (!selectedLoan) return;

    const baseDate = selectedLoan.created_at ? new Date(selectedLoan.created_at) : new Date();

    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(10);

    const { error } = await supabase
      .from('pinjaman')
      .update({
        status_pinjaman: 'approved',
        tanggal_pembayaran: dueDate.toISOString(),
        update_at: new Date().toISOString()
      })
      .eq('id', selectedLoan.id);

    if (!error) {
      setIsApproveModalOpen(false);
      await fetchLoans();
    } else {
      console.error("Failed to approve loan:", error);
      alert("Gagal menyetujui pinjaman.");
    }
  };


  const handleRejectLoan = async () => {
    if (!selectedLoan) return;

    const { error } = await supabase
      .from('pinjaman')
      .update({
        status_pinjaman: 'rejected',
        update_at: new Date().toISOString()
      })
      .eq('id', selectedLoan.id);

    if (!error) {
      await fetchLoans();
    }
  };

  const handleDeleteLoan = async (loanToDelete: any) => {
    if (!loanToDelete?.id) return;

    try {
      const { error } = await supabase
        .from('pinjaman')
        .delete()
        .eq('id', loanToDelete.id);

      if (error) throw error;

      await fetchLoans();
      alert('Loan deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete loan');
    }
  };


  const handlePaymentSubmit = async () => {
    try {
      if (!selectedLoan) return;

      const recommendedPayment = calculateRecommendedPayment(selectedLoan);
      const remaining = selectedLoan.total_pinjaman - (selectedLoan.total_dibayar || 0);
      const { custom_payment, jumlah_angsuran } = paymentData;

      const recommendedRounded = Math.floor(recommendedPayment);
      const remainingRounded = Math.floor(remaining);
      const amountRounded = Math.floor(jumlah_angsuran);

      if (!custom_payment && amountRounded < recommendedRounded && amountRounded < remainingRounded) {
        alert("Amount too small. Use custom payment or pay remaining balance.");
        return;
      }

      if (jumlah_angsuran <= 0 || jumlah_angsuran > remainingRounded) {
        alert("Invalid payment amount.");
        return;
      }

      const { data: lastAngsuran, error: fetchAngsuranError } = await supabase
        .from("angsuran")
        .select("angsuran_ke")
        .eq("id_pinjaman", selectedLoan.id)
        .order("angsuran_ke", { ascending: false })
        .limit(1);

      if (fetchAngsuranError) {
        alert("Failed to get angsuran data.");
        console.error(fetchAngsuranError);
        return;
      }

      const lastAngsuranKe = lastAngsuran?.[0]?.angsuran_ke || 0;
      const angsuranKeToInsert = lastAngsuranKe + 1;

      const { error: insertError } = await supabase.from("angsuran").insert([
        {
          id_anggota: selectedLoan.id_anggota,
          id_pinjaman: selectedLoan.id,
          angsuran_ke: angsuranKeToInsert,
          jumlah_angsuran,
        },
      ]);

      if (insertError) {
        alert("Failed to record payment.");
        console.error(insertError);
        return;
      }

      const newTotalDibayar = (selectedLoan.total_dibayar || 0) + jumlah_angsuran;
      const newRemaining = selectedLoan.total_pinjaman - newTotalDibayar;

      // Calculate next due date (tanggal_pembayaran)
      let nextDueDate = selectedLoan.tanggal_pembayaran
        ? new Date(selectedLoan.tanggal_pembayaran)
        : new Date();

      // Add 1 month to due date
      const year = nextDueDate.getUTCFullYear();
      const month = nextDueDate.getUTCMonth() + 1;
      const day = nextDueDate.getUTCDate();

      nextDueDate = new Date(Date.UTC(year, month, day));

      const updates: any = {
        total_dibayar: newTotalDibayar,
        angsuran_ke: angsuranKeToInsert,
        sisa_angsuran: Math.max(selectedLoan.durasi_pinjaman - angsuranKeToInsert, 0),
        tanggal_pembayaran: nextDueDate.toISOString(),
        update_at: new Date().toISOString(),
      };

      if (newRemaining <= 0) {
        updates.status_pinjaman = "completed";
      }

      const { error: updateError } = await supabase
        .from("pinjaman")
        .update(updates)
        .eq("id", selectedLoan.id);

      if (updateError) {
        alert("Failed to update loan data.");
        console.error(updateError);
        return;
      }

      alert("Payment recorded!");
      setIsPaymentModalOpen(false);
      setPaymentData({ custom_payment: false, jumlah_angsuran: 0, pay_remaining: false });
      fetchLoans();
    } catch (error) {
      console.error("Error during payment submission:", error);
      alert("An error occurred while processing the payment.");
    }
  };


  const filteredLoans = loans.filter((loan) => {
    const id = loan.id_anggota?.toLowerCase() || '';
    const name = loan.biodata_anggota?.nama_lengkap?.toLowerCase() || '';
    const amount = loan.jumlah_pinjaman?.toString() || '';
    const status = loan.status_pinjaman?.toLowerCase() || '';
    const keyword = searchTerm.toLowerCase();

    return (
      id.includes(keyword) ||
      name.includes(keyword) ||
      amount.includes(keyword) ||
      status.includes(keyword)
    );
  });

  const filteredAngsuran = installments.filter((item) => {
    const idAnggota = item.id_anggota?.toLowerCase() || '';
    const nama = item.biodata_anggota?.nama_lengkap?.toLowerCase() || '';
    const idPinjaman = item.id_pinjaman?.toString() || '';
    const angsuranKe = item.angsuran_ke?.toString() || '';
    const jumlah = item.jumlah_angsuran?.toString() || '';
    const keyword = searchTerm.toLowerCase();

    return (
      idAnggota.includes(keyword) ||
      nama.includes(keyword) ||
      idPinjaman.includes(keyword) ||
      angsuranKe.includes(keyword) ||
      jumlah.includes(keyword)
    );
  });


  function calculateRecommendedPayment(loan: { total_pinjaman: number; total_dibayar: number; durasi_pinjaman: number; angsuran_ke: number; }) {
    const remaining = loan.total_pinjaman - (loan.total_dibayar || 0);
    const sisaAngsuran = Math.max(loan.durasi_pinjaman - (loan.angsuran_ke || 0), 1);
    return Math.floor(remaining / sisaAngsuran);
  }

  const itemsPerPage = 10;

  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredLoans.slice(start, end);
  }, [filteredLoans, currentPage]);

  const itemsPerPageTransactions = 15;

  const paginatedTransactions = useMemo(() => {
    const start = (currentPageTransactions - 1) * itemsPerPageTransactions;
    const end = start + itemsPerPageTransactions;
    return filteredAngsuran.slice(start, end); // filteredTransactions holds your transaction data
  }, [filteredAngsuran, currentPageTransactions]);

  const totalPagesTransactions = Math.ceil(filteredAngsuran.length / itemsPerPageTransactions);


  const totalPagesLoans = Math.ceil(filteredLoans.length / itemsPerPage);




  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Pinjaman</h2>
      </div>

      <Tabs defaultValue="loans">
        <TabsList className="border-b">
          <TabsTrigger value="loans">Pinjaman</TabsTrigger>
          <TabsTrigger value="installments">Riwayat Angsuran</TabsTrigger>
        </TabsList>
        <TabsContent value="loans">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari Pinjaman..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchLoans();
                setSearchTerm('');
              }}
            >
              Refresh Tabel
            </Button>

          </div>


          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pinjaman</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jumlah Pinjaman</TableHead>
                  <TableHead>Total Pinjaman</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenor</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Sudah dibayar</TableHead>
                  <TableHead>Angsuran</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.loans ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Loading pinjaman...</TableCell>
                  </TableRow>
                ) : filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Request pinjaman tidak ditemukan..</TableCell>
                  </TableRow>
                ) : (
                  paginatedLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>{loan.id}</TableCell>
                      <TableCell>
                        {loan.id_anggota} - {loan.biodata_anggota?.nama_lengkap || 'No Name'}
                      </TableCell>
                      <TableCell>Rp {Number(loan.jumlah_pinjaman).toLocaleString('id-ID')}</TableCell>
                      <TableCell>Rp {Number(loan.total_pinjaman).toLocaleString('id-ID')}</TableCell>
                      <TableCell>  <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Selected loan:', loan);
                          setSelectedLoan(loan);
                          setIsViewModalOpen(true);
                        }}
                      >
                        {loan.jenis_pinjaman}
                      </Button> </TableCell>
                      <TableCell>{loan.durasi_pinjaman} months</TableCell>
                      <TableCell>
                        <Badge variant={
                          loan.status_pinjaman === 'approved' ? 'default' :
                            loan.status_pinjaman === 'pending' ? 'secondary' :
                              loan.status_pinjaman === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {loan.status_pinjaman}
                        </Badge>
                      </TableCell>
                      <TableCell>Rp {Number(loan.total_dibayar || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell>{loan.angsuran_ke}/{loan.durasi_pinjaman}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {loan.status_pinjaman === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setIsApproveModalOpen(true);
                              }}
                            >
                              Terima
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setIsRejectModalOpen(true);
                              }}
                            >
                              Tolak
                            </Button>
                          </>
                        )}
                        {loan.status_pinjaman === 'approved' && loan.sisa_angsuran > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedLoan(loan);
                              setPaymentData({
                                jumlah_angsuran: calculateRecommendedPayment(loan),
                                custom_payment: false,
                                pay_remaining: false
                              });
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center p-4">
              <p>
                Page {currentPage} of {totalPagesLoans}
              </p>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPagesLoans}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPagesLoans))}
                >
                  Next
                </Button>
              </div>
            </div>

          </div>
        </TabsContent>
        <TabsContent value="installments">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari Angsuran..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchInstallments();
                setSearchTerm('');
              }}
            >
              Refresh Tabel
            </Button>

          </div>


          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Angsuran</TableHead>
                  <TableHead>ID Pinjaman</TableHead>
                  <TableHead>Nama Anggota</TableHead>
                  <TableHead>Angsuran ke</TableHead>
                  <TableHead>Jumlah Angsuran</TableHead>
                  <TableHead>Created at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.installments ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Loading pinjaman...</TableCell>
                  </TableRow>
                ) : filteredAngsuran.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Request pinjaman tidak ditemukan..</TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map((installments) => (
                    <TableRow key={installments.idAnggota}>
                      <TableCell>{installments.id}</TableCell>
                      <TableCell>{installments.id_pinjaman}</TableCell>
                      <TableCell>
                        {installments.id_anggota} - {installments.biodata_anggota?.nama_lengkap || 'No Name'}
                      </TableCell>
                      <TableCell>{installments.angsuran_ke}</TableCell>
                      <TableCell>Rp {Number(installments.jumlah_angsuran).toLocaleString('id-ID')}</TableCell>
                      <TableCell>{new Date(installments.create_at).toLocaleDateString('id-ID')}</TableCell>

                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center p-4">
              <p>
                Page {currentPageTransactions} of {totalPagesTransactions}
              </p>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPageTransactions === 1}
                  onClick={() => setCurrentPageTransactions((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPageTransactions === totalPagesTransactions}
                  onClick={() => setCurrentPageTransactions((prev) => Math.min(prev + 1, totalPagesTransactions))}
                >
                  Next
                </Button>
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>





      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve request pinjaman</DialogTitle>
            <DialogDescription>
              apakah anda yakin ingin menyetujui permohonan pinjaman ini?
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-2">
              <p><strong>Member:</strong> {selectedLoan.id_anggota} - {selectedLoan.biodata_anggota?.nama_lengkap || 'No Name'}</p>
              <p><strong>Amount:</strong> Rp {Number(selectedLoan.jumlah_pinjaman).toLocaleString('id-ID')}</p>
              <p><strong>Duration:</strong> {selectedLoan.durasi_pinjaman} months</p>
              <p><strong>Total to Repay:</strong> Rp {Number(selectedLoan.total_pinjaman).toLocaleString('id-ID')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveLoan}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak request pinjaman</DialogTitle>
            <DialogDescription>
              apakah anda yakin ingin menolak permohonan pinjaman ini?
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-2">
              <p><strong>Member:</strong> {selectedLoan.id_anggota} - {selectedLoan.biodata_anggota?.nama_lengkap || 'No Name'}</p>
              <p><strong>Amount:</strong> Rp {Number(selectedLoan.jumlah_pinjaman).toLocaleString('id-ID')}</p>
              <p><strong>Duration:</strong> {selectedLoan.durasi_pinjaman} months</p>
              <p><strong>Total to Repay:</strong> Rp {Number(selectedLoan.total_pinjaman).toLocaleString('id-ID')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectLoan}>
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pinjaman</DialogTitle>
          </DialogHeader>

          {selectedLoan ? (
            <div className="space-y-4">
              <p><strong>ID Pinjaman:</strong> {selectedLoan.id}</p>
              <p><strong>Anggota:</strong> {selectedLoan.biodata_anggota?.nama_lengkap || "No Name"}</p>
              <p><strong>Jumlah:</strong> Rp {selectedLoan.jumlah_pinjaman?.toLocaleString('id-ID') ?? '-'}</p>
              <p><strong>biaya jasa:</strong> Rp {(selectedLoan.total_pinjaman - selectedLoan.jumlah_pinjaman).toLocaleString('id-ID') ?? '-'}</p>
              <p><strong>Total:</strong> Rp {selectedLoan.total_pinjaman?.toLocaleString('id-ID') ?? '-'}</p>
              <p><strong>Tenor:</strong> {selectedLoan.durasi_pinjaman ?? '-'} bulan</p>
              <p><strong>Status:</strong> {selectedLoan.status_pinjaman || '-'}</p>
              <p><strong>Jenis:</strong> {selectedLoan.jenis_pinjaman || '-'}</p>
              <p><strong>Tanggal:</strong> {selectedLoan.created_at ? new Date(selectedLoan.created_at).toLocaleDateString('id-ID') : '-'}</p>
              <p><strong>Tanggat Pembayaran:</strong> {selectedLoan.tanggal_pembayaran ? new Date(selectedLoan.tanggal_pembayaran).toLocaleDateString('id-ID') : '-'}</p>
            </div>
          ) : (
            <p>Loading...</p>
          )}

          <Button onClick={() => setIsViewModalOpen(false)} className="w-full">
            Tutup
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (confirm("Are you sure you want to delete this loan?")) {
                await handleDeleteLoan(selectedLoan);
              }
            }}
          >
            Hapus
          </Button>
        </DialogContent>
      </Dialog>



      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran Angsuran</DialogTitle>
            <DialogDescription>
              Pembayaran Angsuran : {selectedLoan?.id_anggota} - {selectedLoan?.biodata_anggota?.nama_lengkap || 'No Name'}
            </DialogDescription>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Jumlah Pinjaman</Label>
                  <p>Rp {Number(selectedLoan.jumlah_pinjaman).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <Label>Total Perlu Dibayar</Label>
                  <p>Rp {Number(selectedLoan.total_pinjaman).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <Label>Angsuran</Label>
                  <p>{selectedLoan.angsuran_ke + 1} dari {selectedLoan.durasi_pinjaman}</p>
                </div>
                <div>
                  <Label>Sisa Angsuran</Label>
                  <p>Rp {Number(selectedLoan.total_pinjaman - (selectedLoan.total_dibayar || 0)).toLocaleString('id-ID')}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="custom_payment"
                  checked={paymentData.custom_payment}
                  onChange={(e) => setPaymentData({
                    ...paymentData,
                    custom_payment: e.target.checked,
                    pay_remaining: false,
                    jumlah_angsuran: 0,
                  })}
                />
                <Label htmlFor="custom_payment">Pembayaran Custom</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pay_remaining"
                  checked={paymentData.pay_remaining}
                  onChange={(e) => {
                    const remaining = selectedLoan.total_pinjaman - (selectedLoan.total_dibayar || 0);
                    setPaymentData({
                      ...paymentData,
                      custom_payment: false,
                      pay_remaining: e.target.checked,
                      jumlah_angsuran: e.target.checked ? remaining : 0,
                    });
                  }}
                />
                <Label htmlFor="pay_remaining">Bayar Lunas</Label>
              </div>

              <div>
                <Label htmlFor="jumlah_angsuran">Jumlah Pembayaran</Label>
                <Input
                  id="jumlah_angsuran"
                  type="number"
                  value={paymentData.jumlah_angsuran}
                  onChange={(e) => setPaymentData({
                    ...paymentData,
                    jumlah_angsuran: Number(e.target.value)
                  })}
                  disabled={!paymentData.custom_payment && !paymentData.pay_remaining}
                />
                {!paymentData.custom_payment && !paymentData.pay_remaining && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Rekomendasi Pembayaran : Rp {calculateRecommendedPayment(selectedLoan).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Tutup
            </Button>
            <Button onClick={handlePaymentSubmit}>
              Bayar Pinjaman
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}