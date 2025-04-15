'use client';

import { useEffect, useState } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'react-router-dom';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [formData, setFormData] = useState({
    id_anggota: '',
    jenis_transaksi: '',
    jumlah_transaksi: '',
  });

  const [searchParams] = useSearchParams();
  const idAnggota = searchParams.get('id');

  useEffect(() => {
    fetchTransactions();
    fetchMembers();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from('transaksi_simpanan')
      .select('*, biodata_anggota:id_anggota') // or your relation setup
      .order('created_at', { ascending: false });

    if (idAnggota) {
      query = query.eq('id_anggota', idAnggota);
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else {
      setTransactions(data);
    }

    setLoading(false);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('biodata_anggota')
      .select('id_anggota, nama_lengkap');

    if (!error) {
      setMembers(data);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddTransaction = async () => {
    const { error } = await supabase.from('transaksi_simpanan').insert([{
      id_anggota: formData.id_anggota,
      jenis_transaksi: formData.jenis_transaksi,
      jumlah_transaksi: parseFloat(formData.jumlah_transaksi),
      created_at: new Date().toISOString(),
    }]);

    if (!error) {
      setIsAddModalOpen(false);
      fetchTransactions(); // Refresh data
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Transaksi</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>Tambah Transaksi</Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transactions..." className="pl-8" />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Member ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-red-500">{error}</TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">No transactions found</TableCell>
              </TableRow>
            ) : (
              transactions.map((trx) => (
                <TableRow key={trx.id}>
                  <TableCell>{trx.id}</TableCell>
                  <TableCell>{trx.id_anggota}</TableCell>
                  <TableCell>{trx.biodata_anggota?.nama_lengkap || "No Name"}</TableCell>
                  <TableCell>{trx.jenis_transaksi}</TableCell>
                  <TableCell>Rp {trx.jumlah_transaksi.toLocaleString()}</TableCell>
                  <TableCell>{new Date(trx.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedTransaction(trx);
                        setIsViewModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <p><strong>Transaction ID:</strong> {selectedTransaction.id}</p>
              <p><strong>Member:</strong> {selectedTransaction.biodata_anggota?.nama_lengkap || "No Name"}</p>
              <p><strong>Type:</strong> {selectedTransaction.jenis_transaksi}</p>
              <p><strong>Amount:</strong> Rp {selectedTransaction.jumlah_transaksi.toLocaleString()}</p>
              <p><strong>Date:</strong> {new Date(selectedTransaction.created_at).toLocaleDateString()}</p>
            </div>
          )}
          <Button onClick={() => setIsViewModalOpen(false)} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            
            <div>
              <Label htmlFor="id_anggota" >Member</Label>
              <select id="id_anggota" name="id_anggota" onChange={handleInputChange}    className="w-full !bg-white !text-black !border-gray-300 !border rounded p-2 focus:!outline-none focus:!ring-2 focus:!ring-blue-500">
                <option value="">Select Member</option>
                {members.map((member) => (
                  <option key={member.id_anggota} value={member.id_anggota}>
                    {member.id_anggota} - {member.nama_lengkap || "No Name"}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="jenis_transaksi">Transaction Type</Label>
              <select id="jenis_transaksi" name="jenis_transaksi" onChange={handleInputChange}   className="w-full !bg-white !text-black !border-gray-300 !border rounded p-2 focus:!outline-none focus:!ring-2 focus:!ring-blue-500">
                <option value="">Select Type</option>
                <option value="wajib">wajib</option>
                <option value="pokok">pokok</option>
              </select>
            </div>
            <div>
              <Label htmlFor="jumlah_transaksi">Amount</Label>
              <Input id="jumlah_transaksi" name="jumlah_transaksi" type="number" onChange={handleInputChange} />
            </div>
            <Button onClick={handleAddTransaction} className="w-full">Add Transaction</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}