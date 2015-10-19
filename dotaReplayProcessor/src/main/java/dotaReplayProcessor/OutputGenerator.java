package dotaReplayProcessor;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

public class OutputGenerator {
	BufferedWriter writer;
	List<String> key_order;
	public OutputGenerator(String filename_out) {
		try {
		File file = new File(filename_out);

		FileWriter fw;
	
		fw = new FileWriter(file);

		 writer = new BufferedWriter(fw);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public void init(Map<String, Double> data_fields) {
		key_order = new LinkedList<String>();
		
	    Iterator it = data_fields.entrySet().iterator();
		while (it.hasNext()) {
	        Map.Entry pair = (Map.Entry)it.next();
	       key_order.add((String) pair.getKey());
	    }
		Collections.sort(key_order);
        try {
			Iterator it_keys = key_order.iterator();
			while (it_keys.hasNext()) {
		        String key = (String) it_keys.next();
				writer.write(key);
				
		        if(it_keys.hasNext())
		        {
		        	writer.write(",");
		        }
		    }
			writer.write("\n");
        } catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	public void writeTick(Map<String, Double> data_fields) {
		try {
			
			Iterator it_keys = key_order.iterator();
			while (it_keys.hasNext()) {
		        String key = (String) it_keys.next();
				writer.write(""+data_fields.get(key));
				
		        if(it_keys.hasNext())
		        {
		        	writer.write(",");
		        }
		    }
			writer.write("\n");
        } catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public void finish()
	{
		try {
			writer.flush();
			writer.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}
}
